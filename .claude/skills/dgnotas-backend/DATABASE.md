# Database — DGNotas Backend

Convenções de PostgreSQL. Válidas para todo schema de dado de negócio. Scripts utilitários soltos podem ignorar parte destas regras (veja [SKILL.md — Quando NÃO aplicar](SKILL.md)).

## Nomenclatura

- **Tabelas**: `snake_case`, plural, em inglês quando possível. Termos fiscais brasileiros sem tradução razoável ficam em português (`notas_fiscais`, `itens_da_nota`, `certificados`). Escolha uma convenção por agregado e mantenha.
- **Colunas**: `snake_case`.
- **Foreign keys**: `<tabela_singular>_id` → `empresa_id`, `nota_id`, `cliente_id`.
- **Booleans**: prefixo `is_` ou `has_` → `is_active`, `has_certificado`.
- **Timestamps**: sufixo `_at` → `created_at`, `emitida_em`, `cancelada_em`. Use `_at` (inglês) para timestamps genéricos do sistema; `_em` para timestamps de domínio fiscal quando o nome em português for mais claro. Consistência dentro do mesmo agregado.
- **Enums**: criados como `CREATE TYPE <nome>_enum AS ENUM (...)`, sufixo `_enum`.
- **Indexes**: `idx_<tabela>_<colunas>`.
- **Unique constraints**: `uq_<tabela>_<colunas>`.
- **Check constraints**: `ck_<tabela>_<regra>`.

## Colunas obrigatórias em toda tabela de negócio

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at  TIMESTAMPTZ                                -- soft delete quando aplicável
```

- **UUID v4** para PKs — nunca `SERIAL`. Evita colisão entre ambientes, facilita sharding futuro, não vaza contagem.
- **`TIMESTAMPTZ`** sempre. Nunca `TIMESTAMP` sem timezone — SEFAZ espera horário de Brasília, relógio do servidor pode ser UTC, misturar vira bug fiscal.
- **`now()`** no default de `created_at`. `updated_at` vive com trigger (ver abaixo) ou atualizado explicitamente pelo repository.
- **Soft delete** (`deleted_at IS NULL`) em agregados principais (notas, empresas, clientes). Dados fiscais **não se apagam** — SEFAZ guarda o histórico, o banco também.

### Trigger de `updated_at`

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notas_fiscais_updated_at
BEFORE UPDATE ON notas_fiscais
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## Multi-tenancy

**Regra inegociável**: toda tabela de dado de negócio tem:

```sql
empresa_id UUID NOT NULL REFERENCES empresas(id),
```

Mais index em `empresa_id`. Mais **toda query** de repository filtra por `empresa_id`. Mais **toda unique** inclui `empresa_id` quando o dado é escopado por empresa.

```sql
-- ✅ unique por empresa
CONSTRAINT uq_notas_fiscais_numero UNIQUE (empresa_id, numero, serie, tipo)

-- ❌ unique global — quebra assim que a segunda empresa emite
CONSTRAINT uq_notas_fiscais_numero UNIQUE (numero, serie)
```

**Exceções** (não têm `empresa_id`): tabelas globais do sistema — `empresas`, `usuarios`, `auditoria_global`. Qualquer outra tabela sem `empresa_id` é suspeita e precisa justificar.

## Tipos específicos do domínio fiscal

| Dado | Tipo | Observação |
|---|---|---|
| CNPJ | `VARCHAR(14)` + `CHECK (char_length(cnpj) = 14)` | Só dígitos. Formatação no presenter. |
| CPF | `VARCHAR(11)` + `CHECK` | Só dígitos. |
| Inscrição estadual | `VARCHAR(20)` | Varia por UF. |
| CEP | `VARCHAR(8)` + `CHECK` | Só dígitos. |
| Chave de acesso NF-e | `VARCHAR(44)` + `CHECK (char_length = 44)` | 44 dígitos exatos. |
| NCM | `VARCHAR(8)` | 8 dígitos. |
| CFOP | `VARCHAR(4)` | 4 dígitos. |
| Valor monetário | `NUMERIC(15, 2)` | **Nunca FLOAT/REAL** — erro de arredondamento é inadmissível em fiscal. |
| Alíquota (%) | `NUMERIC(5, 4)` + `CHECK BETWEEN 0 AND 1` | Armazenar como fração (0.1800 = 18%). |
| Quantidade | `NUMERIC(15, 4)` | Aceita frações (kg, litro). |
| XML da nota | `TEXT` | Compressão via `ALTER TABLE ... ALTER COLUMN xml SET STORAGE EXTERNAL` se crescer. |
| Status de nota | `ENUM` PostgreSQL | Ver abaixo. |

### Enum de status

```sql
CREATE TYPE status_nota_enum AS ENUM (
  'rascunho',
  'processando',
  'autorizada',
  'rejeitada',
  'cancelada',
  'contingencia'
);
```

**Cuidado**: adicionar valor novo ao enum é operação de migration (`ALTER TYPE ... ADD VALUE`). Remover valor exige recriar o tipo — planeje bem antes.

## Indexes obrigatórios

1. **Toda FK** tem index. O PostgreSQL não cria automaticamente; se não criar, `DELETE` em cascata vira table scan.
2. **`empresa_id`** em toda tabela multi-tenant.
3. **Colunas de busca frequente**: número da nota, chave de acesso, CNPJ do cliente.
4. **Timestamps usados em range queries**: `emitida_em`, `created_at` (parcial, veja abaixo).

### Indexes parciais (ignoram soft-deleted)

```sql
CREATE INDEX idx_notas_fiscais_empresa_status
  ON notas_fiscais (empresa_id, status)
  WHERE deleted_at IS NULL;
```

Queries do dia-a-dia sempre filtram `deleted_at IS NULL`, então o index parcial é menor e mais rápido.

## Constraints

- **UNIQUE** em `(empresa_id, numero, serie, tipo)` pra evitar duplicata de número de nota.
- **CHECK** em alíquotas (`0 ≤ aliquota ≤ 1`), CNPJ (tamanho 14), chave de acesso (tamanho 44), quantidades positivas, valores monetários ≥ 0.
- **NOT NULL** generoso — NULL só onde realmente representa "desconhecido / opcional".
- **FK com `ON DELETE`** pensado: `RESTRICT` (padrão) pra dados fiscais; `CASCADE` só em filho claramente parte do aggregate (`itens_da_nota` em cascata com `notas_fiscais`).

## Migrations

- **Uma migration por mudança lógica.** Não empilhar `ALTER`s não relacionados no mesmo arquivo.
- **Nome descritivo com timestamp**: `20260419_120000_create_notas_fiscais.sql`.
- **Reversíveis sempre que possível** — mantenha um `.down.sql` paralelo. Alterações destrutivas (drop coluna, drop tabela) exigem revisão extra.
- **Sem código de aplicação na migration.** SQL puro. Se precisar migrar dados, é um step separado.
- **Idempotência** onde faz sentido (`CREATE TABLE IF NOT EXISTS` só em dev/seed — em produção, migrations são ordenadas).

### Ordem segura para mudanças em produção

1. Adicionar coluna `NULLABLE` com default.
2. Deploy da aplicação que escreve na coluna.
3. Backfill em lotes.
4. Deploy que também lê da coluna.
5. `ALTER COLUMN SET NOT NULL` (se for o caso).

## Transações

**Toda operação que muda múltiplas tabelas roda em transação.** Ex: salvar `Nota` + `itens_da_nota`:

```ts
await pool.query('BEGIN');
try {
  await client.query('INSERT INTO notas_fiscais ...');
  await client.query('INSERT INTO itens_da_nota ...');
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
}
```

Padrão recomendado: método `withTransaction(fn)` no repository ou em um `UnitOfWork` da infra. Use case nunca sabe que existe transação — ele pede pro repository salvar o aggregate inteiro, o repository faz a transação.

## Connection pooling

```ts
// src/infrastructure/database/connection.ts
import { Pool } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,                    // ajuste por ambiente
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'dgnotas-backend',
});

pool.on('error', (err) => {
  // logger injetado via composition root, não console
  console.error('unexpected pg pool error', err);
});
```

- `max`: 1.5× a 2× número de CPUs do app server, respeitando limite do banco.
- Nunca compartilhar pool entre empresas diferentes — o escopo é feito no WHERE, não no pool.
- Em testes de integração, pool separado, banco separado (testcontainers).

## Migration de exemplo — `notas_fiscais`

```sql
-- migrations/20260419_120000_create_notas_fiscais.sql

CREATE TYPE tipo_nota_enum AS ENUM ('nfe', 'nfse');
CREATE TYPE status_nota_enum AS ENUM (
  'rascunho', 'processando', 'autorizada', 'rejeitada', 'cancelada', 'contingencia'
);

CREATE TABLE notas_fiscais (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES empresas(id),

  numero                INTEGER NOT NULL,
  serie                 INTEGER NOT NULL,
  tipo                  tipo_nota_enum NOT NULL,
  status                status_nota_enum NOT NULL DEFAULT 'rascunho',

  emitente_cnpj         VARCHAR(14) NOT NULL,
  tomador_cnpj          VARCHAR(14),
  tomador_cpf           VARCHAR(11),
  tomador_nome          VARCHAR(255) NOT NULL,

  chave_acesso          VARCHAR(44),
  protocolo_autorizacao VARCHAR(50),
  xml_emitido           TEXT,
  xml_autorizado        TEXT,

  valor_total           NUMERIC(15, 2) NOT NULL DEFAULT 0,
  valor_impostos        NUMERIC(15, 2) NOT NULL DEFAULT 0,

  motivo_rejeicao       TEXT,
  motivo_cancelamento   TEXT,

  emitida_em            TIMESTAMPTZ,
  cancelada_em          TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT uq_notas_fiscais_numero
    UNIQUE (empresa_id, numero, serie, tipo),

  CONSTRAINT ck_notas_fiscais_emitente_cnpj
    CHECK (char_length(emitente_cnpj) = 14),

  CONSTRAINT ck_notas_fiscais_tomador_doc
    CHECK (
      (tomador_cnpj IS NOT NULL AND char_length(tomador_cnpj) = 14) OR
      (tomador_cpf  IS NOT NULL AND char_length(tomador_cpf)  = 11)
    ),

  CONSTRAINT ck_notas_fiscais_chave_acesso
    CHECK (chave_acesso IS NULL OR char_length(chave_acesso) = 44),

  CONSTRAINT ck_notas_fiscais_valores
    CHECK (valor_total >= 0 AND valor_impostos >= 0)
);

CREATE INDEX idx_notas_fiscais_empresa_status
  ON notas_fiscais (empresa_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_notas_fiscais_empresa_emitida_em
  ON notas_fiscais (empresa_id, emitida_em DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_notas_fiscais_chave_acesso
  ON notas_fiscais (chave_acesso)
  WHERE chave_acesso IS NOT NULL;

CREATE INDEX idx_notas_fiscais_tomador_cnpj
  ON notas_fiscais (empresa_id, tomador_cnpj)
  WHERE tomador_cnpj IS NOT NULL;

CREATE TRIGGER trg_notas_fiscais_updated_at
BEFORE UPDATE ON notas_fiscais
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tabela filha do aggregate Nota
CREATE TABLE itens_da_nota (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id),
  nota_id           UUID NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,

  ordem             INTEGER NOT NULL,
  descricao         VARCHAR(255) NOT NULL,
  ncm               VARCHAR(8),
  cfop              VARCHAR(4),
  quantidade        NUMERIC(15, 4) NOT NULL,
  valor_unitario    NUMERIC(15, 2) NOT NULL,
  aliquota_iss      NUMERIC(5, 4),
  aliquota_icms     NUMERIC(5, 4),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_itens_da_nota_ordem UNIQUE (nota_id, ordem),
  CONSTRAINT ck_itens_da_nota_quantidade CHECK (quantidade > 0),
  CONSTRAINT ck_itens_da_nota_valor CHECK (valor_unitario >= 0),
  CONSTRAINT ck_itens_da_nota_aliquota_iss
    CHECK (aliquota_iss IS NULL OR (aliquota_iss BETWEEN 0 AND 1)),
  CONSTRAINT ck_itens_da_nota_aliquota_icms
    CHECK (aliquota_icms IS NULL OR (aliquota_icms BETWEEN 0 AND 1))
);

CREATE INDEX idx_itens_da_nota_nota ON itens_da_nota (nota_id);
CREATE INDEX idx_itens_da_nota_empresa ON itens_da_nota (empresa_id);

CREATE TRIGGER trg_itens_da_nota_updated_at
BEFORE UPDATE ON itens_da_nota
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Migration de rollback correspondente em `.down.sql`:

```sql
DROP TABLE IF EXISTS itens_da_nota;
DROP TABLE IF EXISTS notas_fiscais;
DROP TYPE  IF EXISTS status_nota_enum;
DROP TYPE  IF EXISTS tipo_nota_enum;
```
