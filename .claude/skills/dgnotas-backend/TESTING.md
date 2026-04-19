# Testing — DGNotas Backend

A estratégia muda **por camada**. A mesma regra não serve pra um value object e pra um adapter de SEFAZ.

## Ferramentas recomendadas

- **Vitest** — mais rápido que Jest em TS, ESM nativo, watch decente.
- **testcontainers** (`@testcontainers/postgresql`) — PostgreSQL efêmero pra testes de integração.
- **supertest** — request HTTP nos testes e2e.
- **node-mocks-http** — útil quando quer testar controller sem subir servidor inteiro.

> Decisão em aberto se vamos adotar testcontainers vs banco dedicado de teste com `TRUNCATE` entre suites. Veja TODO no [SKILL.md](SKILL.md).

## Convenções gerais

- Um arquivo `.test.ts` **ao lado** do arquivo testado.
  `src/domain/entities/nota.ts` → `src/domain/entities/nota.test.ts`.
- Nome do teste descreve **comportamento**, não implementação, em português:
  ✅ `deve rejeitar emissão quando certificado está expirado`
  ❌ `testCertExpiredThrow`
- **Arrange / Act / Assert** explícito — uma linha em branco separando cada bloco.
- **Fixtures** em `__fixtures__/` por camada. Builders em `__fixtures__/builders/` (ex: `aNota().comCertificadoExpirado().build()`).
- **Nada de mock genérico em domain/application.** Use fakes/in-memory implementations explícitas.
- Teste comportamento público do aggregate, **não método privado**. Se precisar testar um método privado, é sinal de que ele quer virar um VO ou função pura.

---

## Camada: domain

**Objetivo**: blindar regras fiscais e invariantes. São os testes mais baratos e mais valiosos — rodam em milissegundos.

**Estratégia**: unit puro. Zero mock (não há infra pra mockar). Instancia entity/VO direto.

**Cobertura alvo**: ≥ 90%. Se um VO ou entity tem menos, é porque tem pouco comportamento — revise se ele deveria existir.

```ts
// src/domain/entities/nota.test.ts
import { describe, it, expect } from 'vitest';
import { Nota, ItemDaNota, CNPJ, Money } from './';
import { PrazoDeCancelamentoExcedidoError } from '../errors/prazo-de-cancelamento-excedido-error';
import { aNota } from '../__fixtures__/builders/nota-builder';

describe('Nota.cancelar', () => {
  it('deve cancelar nota autorizada dentro do prazo de 24h', () => {
    const agora = new Date('2026-04-19T10:00:00Z');
    const nota = aNota()
      .autorizada({ emitidaEm: new Date('2026-04-19T00:00:00Z') })
      .build();

    const result = nota.cancelar({ motivo: 'erro de digitação', agora });

    expect(result.isSuccess).toBe(true);
    expect(nota.status).toBe('cancelada');
  });

  it('deve rejeitar cancelamento após 24h da emissão', () => {
    const agora = new Date('2026-04-19T10:00:00Z');
    const nota = aNota()
      .autorizada({ emitidaEm: new Date('2026-04-17T00:00:00Z') })
      .build();

    const result = nota.cancelar({ motivo: 'qualquer', agora });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(PrazoDeCancelamentoExcedidoError);
  });
});
```

```ts
// src/domain/value-objects/cnpj.test.ts
describe('CNPJ.create', () => {
  it.each([
    ['12345678000195', true],              // válido
    ['12.345.678/0001-95', true],          // formatado também aceita
    ['12345678000100', false],             // dígito inválido
    ['11111111111111', false],             // todos iguais
    ['1234', false],                       // tamanho
  ])('CNPJ %s → válido: %s', (raw, esperado) => {
    expect(CNPJ.create(raw).isSuccess).toBe(esperado);
  });
});
```

---

## Camada: application

**Objetivo**: testar orquestração do use case, caminhos de erro, dispatch de eventos, escopo de `companyId`.

**Estratégia**: use case real + **in-memory implementations** dos ports (não mocks com `vi.fn()`). Por quê? In-memory é uma implementação honesta da interface — se a interface mudar, o TS quebra a in-memory; se você usa `vi.fn()` + `mockReturnValue`, o teste continua "passando" sobre uma API inventada.

Crie `InMemoryNotaRepository`, `FakeSefazGateway`, `FixedClock`, `InMemoryEventDispatcher` em `src/infrastructure/__fakes__/` (ou `src/application/__fixtures__/` — escolha um e mantenha).

```ts
// src/application/use-cases/nota/emitir-nfse.use-case.test.ts
describe('EmitirNFSeUseCase', () => {
  let repo: InMemoryNotaRepository;
  let empresaRepo: InMemoryEmpresaRepository;
  let sefaz: FakeSefazGateway;
  let clock: FixedClock;
  let dispatcher: InMemoryEventDispatcher;
  let useCase: EmitirNFSeUseCase;

  beforeEach(() => {
    repo = new InMemoryNotaRepository();
    empresaRepo = new InMemoryEmpresaRepository();
    sefaz = new FakeSefazGateway();
    clock = new FixedClock('2026-04-19T12:00:00Z');
    dispatcher = new InMemoryEventDispatcher();
    useCase = new EmitirNFSeUseCase(repo, empresaRepo, sefaz, clock, dispatcher);
  });

  it('deve emitir NFSe e disparar evento NotaEmitida', async () => {
    const empresa = anEmpresa().build();
    empresaRepo.add(empresa);
    sefaz.configure({ behavior: 'aceita', chave: '3519' + '0'.repeat(40) });

    const result = await useCase.execute({
      companyId: empresa.id,
      tomadorCNPJ: '12345678000195',
      serie: 1,
      itens: [{ descricao: 'Consultoria', quantidade: 1, valorUnitario: 1000 }],
    });

    expect(result.isSuccess).toBe(true);
    expect(repo.all()).toHaveLength(1);
    expect(dispatcher.dispatched.map(e => e.type)).toContain('nota.emitida');
  });

  it('deve retornar NotFoundError quando empresa não existe', async () => {
    const result = await useCase.execute({
      companyId: 'empresa-inexistente',
      tomadorCNPJ: '12345678000195',
      serie: 1,
      itens: [{ descricao: 'X', quantidade: 1, valorUnitario: 1 }],
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('não deve persistir nota se SEFAZ rejeitar', async () => {
    const empresa = anEmpresa().build();
    empresaRepo.add(empresa);
    sefaz.configure({ behavior: 'rejeita', motivo: 'certificado expirado' });

    const result = await useCase.execute({ /* ... */ });

    expect(result.isFailure).toBe(true);
    expect(repo.all()).toHaveLength(0);
  });

  it('não deve permitir emitir nota no contexto de outra empresa', async () => {
    // escopo de companyId é responsabilidade que precisa ter teste explícito
    /* ... */
  });
});
```

Cobertura alvo: ≥ 80%. Cobrir todos os caminhos de erro do use case — são regras.

---

## Camada: infrastructure

**Objetivo**: garantir que as implementações concretas honram o contrato dos ports e funcionam contra PostgreSQL real / SEFAZ real (homologação).

**Estratégia**: **integração real**. Mockar infra é mentir.

### Repositories — PostgreSQL de teste

```ts
// src/infrastructure/database/repositories/pg-nota-repository.test.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

describe('PgNotaRepository', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repo: PgNotaRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await runMigrations(pool);
    repo = new PgNotaRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE notas_fiscais, itens_da_nota, empresas RESTART IDENTITY CASCADE');
  });

  it('persiste e recupera nota com itens', async () => {
    const empresa = await seedEmpresa(pool);
    const nota = aNota().comEmpresa(empresa).comDoisItens().build();

    await repo.save(nota);
    const recuperada = await repo.findById(empresa.id, nota.id);

    expect(recuperada).not.toBeNull();
    expect(recuperada!.equals(nota)).toBe(true);
  });

  it('findById não retorna nota de outra empresa', async () => {
    const empresaA = await seedEmpresa(pool);
    const empresaB = await seedEmpresa(pool);
    const nota = aNota().comEmpresa(empresaA).build();
    await repo.save(nota);

    const naoDeveriaEncontrar = await repo.findById(empresaB.id, nota.id);

    expect(naoDeveriaEncontrar).toBeNull();
  });

  it('nextNumero incrementa corretamente por (empresa, serie)', async () => {
    /* ... */
  });
});
```

### Adapters de SEFAZ / prefeitura

**Não mockar.** Testar contra **ambiente de homologação** do próprio SEFAZ com certificado de homologação. Mock de SEFAZ mente — os erros de produção aparecem em detalhes que a gente não reproduz.

Separar em suite própria (`.integration.test.ts`) marcada para rodar em CI noturno, não em cada commit.

```ts
// src/infrastructure/sefaz/sefaz-sp-adapter.integration.test.ts
describe.skipIf(!process.env.SEFAZ_HOMOLOGACAO)('SefazSPAdapter — homologação', () => {
  it('deve autorizar NF-e válida', async () => { /* ... */ });
  it('deve retornar rejeição quando chave de acesso é inválida', async () => { /* ... */ });
});
```

Cobertura alvo: todos os métodos públicos do port. Mais casos de erro conhecidos (certificado expirado, schema inválido, fora do ar).

---

## Camada: interface

**Objetivo**: verificar que os endpoints principais funcionam fim-a-fim — validação, auth, use case, presenter.

**Estratégia**: e2e com supertest + banco real (mesmo testcontainers), idealmente com SEFAZ fake (o use case já foi testado contra SEFAZ real em `infrastructure`, o que e2e valida é o glue HTTP).

```ts
// src/interface/http/routes/notas.routes.e2e.test.ts
describe('POST /empresas/:id/notas', () => {
  let app: Express;
  let pool: Pool;
  let empresa: Empresa;
  let token: string;

  beforeAll(async () => {
    ({ app, pool } = await buildTestApp());
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE ... RESTART IDENTITY CASCADE');
    empresa = await seedEmpresa(pool);
    token = signJwt({ userId: empresa.ownerId });
  });

  it('201 quando payload válido', async () => {
    const response = await request(app)
      .post(`/empresas/${empresa.id}/notas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tomadorCNPJ: '12345678000195', serie: 1, itens: [/* ... */] });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ status: 'autorizada' });
  });

  it('422 quando CNPJ inválido', async () => {
    const response = await request(app)
      .post(`/empresas/${empresa.id}/notas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tomadorCNPJ: '123', serie: 1, itens: [] });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('CNPJ_INVALIDO');
  });

  it('403 ao tentar emitir nota em empresa de outro usuário', async () => {
    const outraEmpresa = await seedEmpresa(pool);
    const response = await request(app)
      .post(`/empresas/${outraEmpresa.id}/notas`)
      .set('Authorization', `Bearer ${token}`)
      .send(/* ... */);

    expect(response.status).toBe(403);
  });
});
```

Cobertura: golden path + erros mais prováveis (validação, auth, 404). Não é a camada onde você persegue cobertura — o trabalho de cobrir regra é do domain e do use case.

---

## Pirâmide resumo

```
                      e2e (interface)         poucos, lentos, caros
                   ▲  ──────────────────
                   │
                   │  integração (infra)      médios, contra PG/SEFAZ real
                   │  ──────────────────
                   │
                   │  use case (application)  muitos, rápidos, com fakes
                   │  ──────────────────
                   │
                   │  unit (domain)           muitíssimos, instantâneos
                   │  ──────────────────
```

Valor por segundo de CI cai quando a pirâmide inverte. Se você estiver mockando repository e SEFAZ em teste de use case, ótimo — está na camada certa. Se estiver mockando entity ou value object em teste de domain, pare.

## Quando NÃO escrever teste

- Getters/setters triviais.
- DTOs planos.
- Mappers sem lógica (se o mapper tem condicional, aí sim).
- Código que ainda vai mudar nos próximos dias (escreva depois de estabilizar).

A skill **não** força TDD. Escreva teste quando ele te dá confiança — e especialmente antes de mexer em regra fiscal sensível (cancelamento, prazo, cálculo de imposto).
