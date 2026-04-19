# Architecture — DGNotas Backend

4 camadas concêntricas, dependências apontando **sempre para dentro**:

```
┌─────────────────────────────────────────────────────────────┐
│  interface         (HTTP, CLI, queue consumers)             │
│    ↓ depende de                                             │
│  infrastructure    (PostgreSQL, SEFAZ, e-mail, certificados)│
│    ↓ depende de                                             │
│  application       (use cases, ports, DTOs)                 │
│    ↓ depende de                                             │
│  domain            (entities, value objects, events)        │
└─────────────────────────────────────────────────────────────┘
```

Regra de ouro: se você precisar fazer domain chamar algo de infra, inverta — crie uma interface (port) em `application/ports/` e implemente em `infrastructure/`.

## Estrutura de pastas canônica

```
src/
├── domain/                   # regras de negócio puras
│   ├── entities/             # Empresa, Nota, Produto, Servico, Cliente, Certificado
│   ├── value-objects/        # CNPJ, CPF, NCM, ChaveAcesso, Money, Aliquota
│   ├── errors/               # DomainError (base) + específicos
│   ├── events/               # NotaEmitida, NotaRejeitada, CertificadoExpirando
│   └── shared/               # Result, Entity<T>, ValueObject<T>, AggregateRoot<T>
│
├── application/              # orquestração de casos de uso
│   ├── use-cases/
│   │   ├── empresa/          # CadastrarEmpresaUseCase, AtualizarEmpresaUseCase
│   │   ├── nota/             # EmitirNFSeUseCase, CancelarNotaUseCase
│   │   └── certificado/      # UploadCertificadoUseCase
│   ├── ports/                # interfaces: NotaRepository, SefazGateway, Mailer
│   ├── dtos/                 # input/output de cada use case
│   └── errors/               # ApplicationError (base) + específicos (NotFound, etc.)
│
├── infrastructure/           # implementações concretas
│   ├── database/
│   │   ├── connection.ts     # pool PostgreSQL
│   │   ├── migrations/       # SQL timestamped
│   │   ├── repositories/     # PgNotaRepository, PgEmpresaRepository
│   │   └── mappers/          # row → entity, entity → row
│   ├── sefaz/                # adapters por UF (SefazSPAdapter, SefazRJAdapter)
│   ├── prefeituras/          # adapters por município
│   ├── certificates/         # leitura e assinatura com cert A1
│   ├── mail/                 # MailerSMTP, MailerResend
│   ├── events/               # InMemoryEventDispatcher
│   └── config/               # env, secrets, logger
│
└── interface/                # entrada
    ├── http/
    │   ├── routes/           # definição de rotas
    │   ├── controllers/      # chama use cases
    │   ├── middlewares/      # auth, companyContext, errorHandler
    │   ├── validators/       # zod schemas de request
    │   └── presenters/       # entity → JSON
    ├── server.ts             # bootstrap HTTP
    └── composition-root.ts   # monta o grafo de dependências
```

---

## Camada: domain

**Coração.** Contém as regras do negócio fiscal. Sabe o que é uma Nota, uma Empresa, um Certificado, e o que elas podem ou não podem fazer.

### O que entra
- Entities: `Empresa`, `Nota`, `ItemDaNota`, `Cliente`, `Produto`, `Servico`, `Certificado`
- Value Objects: `CNPJ`, `CPF`, `InscricaoEstadual`, `Endereco`, `ChaveAcesso`, `NCM`, `CFOP`, `CEST`, `Money`, `Aliquota`, `RegimeTributario`
- Domain Events: `NotaEmitida`, `NotaRejeitada`, `NotaCancelada`, `CertificadoProximoDoVencimento`
- Domain Errors: `CNPJInvalidoError`, `NotaJaCanceladaError`, `PrazoDeCancelamentoExcedidoError`, `CertificadoExpiradoError`
- Helpers puros: `Result<T, E>`, classes-base `Entity`, `AggregateRoot`, `ValueObject`

### O que NÃO entra (violações concretas)
- `import express from 'express'` — **nunca**
- `import { Pool } from 'pg'` — **nunca**
- `import axios from 'axios'` — **nunca**
- `import { PrismaClient } from '@prisma/client'` — **nunca**
- Uso de `console.log` ou logger concreto — se precisar observar, recebe um `Logger` via port
- Chamadas `fetch`, `fs.readFile`, `process.env`
- Conhecimento de "quantos dias tem o prazo de cancelamento" quando isso depende do ambiente → recebe como valor ou por regra de domínio explícita

### Como testar
Testes unitários puros. Zero mock de framework — não há framework aqui. Instancia entity/VO direto, chama método, assere resultado.

```ts
// src/domain/entities/nota.test.ts
describe('Nota.cancelar', () => {
  it('deve rejeitar cancelamento após 24 horas da emissão', () => {
    const nota = Nota.reconstitute({ /* ... */ emitidaEm: hoursAgo(25), status: 'autorizada' });
    const result = nota.cancelar({ motivo: 'erro de digitação', agora: new Date() });
    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(PrazoDeCancelamentoExcedidoError);
  });
});
```

### Exemplo canônico
Veja [PATTERNS.md — Entity (Nota)](PATTERNS.md#entity--nota).

---

## Camada: application

**Orquestração.** Define quais operações existem no sistema e como elas encadeiam chamadas a domain, repositories e gateways.

### O que entra
- Use cases (um por arquivo): `EmitirNFSeUseCase`, `CancelarNotaUseCase`, `CadastrarEmpresaUseCase`, `UploadCertificadoUseCase`
- Ports (interfaces): `NotaRepository`, `EmpresaRepository`, `SefazGateway`, `CertificateStore`, `Mailer`, `EventDispatcher`, `Clock`, `Logger`
- DTOs de input/output dos use cases
- `ApplicationError` base + `NotFoundError`, `UnauthorizedError`, `ConflictError`
- Composição que o use case precisa — **mas nunca instanciando a infra concreta**

### O que NÃO entra
- Código SQL (`SELECT ... FROM notas`) — isso é repository, que é infra
- `import { Pool } from 'pg'` — só a interface, não a implementação
- Chamada HTTP direta pra SEFAZ — é `SefazGateway.enviarNFe(...)`
- Criação direta de XML ou certificado — é port
- `req` / `res` do HTTP — isso é interface

### Como testar
Testes de use case com **in-memory implementations** dos ports, não mocks frágeis. Ex: `InMemoryNotaRepository`, `FakeSefazGateway`. Testa o caminho feliz e todos os caminhos de erro.

```ts
const repo = new InMemoryNotaRepository();
const sefaz = new FakeSefazGateway({ behavior: 'aceita' });
const useCase = new EmitirNFSeUseCase(repo, sefaz, new FixedClock('2026-04-19'));
const result = await useCase.execute({ companyId, /* ... */ });
```

### Exemplo canônico
Veja [PATTERNS.md — Use Case (EmitirNFSe)](PATTERNS.md#use-case--emitirnfse).

---

## Camada: infrastructure

**Implementações concretas.** Tudo que fala com o mundo externo mora aqui — banco, SEFAZ, prefeitura, certificado, e-mail, secrets.

### O que entra
- `PgNotaRepository implements NotaRepository` — queries SQL, connection pool
- `PgEmpresaRepository implements EmpresaRepository`
- `SefazSPAdapter implements SefazGateway` — SOAP, assinatura XML, retries
- `PrefeituraSaoPauloAdapter implements PrefeituraGateway`
- `CertificateStoreS3 implements CertificateStore` — upload/download cert A1
- `MailerResend implements Mailer`
- `InMemoryEventDispatcher implements EventDispatcher`
- `SystemClock implements Clock`
- `PinoLogger implements Logger`
- Migrations SQL, connection pool, config de env

### O que NÃO entra
- Use case não pode viver aqui — é camada errada
- Regra de negócio: se o repository decide "se o status é X, faz Y", está misturando camada. Regra vai pra entity/use case; repository só persiste.
- Tipos/entities do domínio redefinidos — repository **retorna** entity do domínio via mapper, não uma classe própria

### Como testar
Testes de **integração reais** contra PostgreSQL de teste (testcontainers ou banco dedicado). Adapters de SEFAZ testados em ambiente de homologação do próprio SEFAZ (não mockar — o mock mente).

```ts
describe('PgNotaRepository', () => {
  const container = await new PostgreSqlContainer().start();
  const repo = new PgNotaRepository(container.connectionUri);
  it('recupera nota por id respeitando companyId', async () => { /* ... */ });
});
```

### Exemplo canônico
Veja [PATTERNS.md — Repository (NotaRepository)](PATTERNS.md#repository--notarepository).

### Nota sobre ORM vs SQL puro
Decisão em aberto — veja TODO no [SKILL.md](SKILL.md).

- **`pg` + SQL puro**: repositories escrevem SQL explícito, mappers convertem rows em entities. Zero acoplamento do domain com ORM. Mais código, mais controle.
- **Prisma / Drizzle**: produtividade, tipos inferidos, migrations geradas. **Risco**: se `PrismaClient` vaza pro domain (ex: usar `Prisma.Invoice` como entity), o domain fica acoplado ao ORM — isso quebra a regra 2. Se escolher ORM, o tipo gerado fica só dentro de `infrastructure/database/`, e o mapper traduz pra entity.

---

## Camada: interface

**Entrada.** Traduz protocolo externo (HTTP, CLI, fila) ↔ use case.

### O que entra
- Rotas: `POST /empresas`, `POST /empresas/:id/notas`, `POST /notas/:id/cancelar`
- Controllers: recebem request validado, chamam use case, formatam resposta
- Middlewares: `authMiddleware`, `companyContextMiddleware`, `errorHandlerMiddleware`
- Validators: Zod schemas de request body / query / params
- Presenters: entity → JSON de resposta (nunca expor row do banco)
- `server.ts` — bootstrap do framework HTTP
- `composition-root.ts` — instancia repositories concretos, gateways e use cases, injeta nos controllers

### O que NÃO entra
- Regra de negócio: "se o CNPJ for inválido, retorna 400" é responsabilidade duplicada — validação sintática é do validator, validação de domínio (dígito verificador, existência) é do value object/use case. Controller **nunca** decide comportamento de negócio.
- SQL direto — é infra
- Chamada direta a SEFAZ ou e-mail — passa pelo use case

### Como testar
Testes e2e dos endpoints principais. Request real (supertest), banco real, valida status e body de resposta. Não precisa cobrir 100% — cobre golden paths e erros mais prováveis.

### Exemplo canônico

```ts
// src/interface/http/controllers/emitir-nfse.controller.ts
export class EmitirNFSeController {
  constructor(private readonly useCase: EmitirNFSeUseCase) {}

  async handle(req: Request, res: Response) {
    const input = emitirNFSeSchema.parse(req.body);                 // validator (Zod)
    const companyId = req.companyContext.id;                        // middleware
    const result = await this.useCase.execute({ companyId, ...input });
    if (result.isFailure) return errorToHttp(res, result.error);    // mapeia DomainError/AppError → status
    return res.status(201).json(notaPresenter(result.value));
  }
}
```

---

## Composition root

Um único ponto onde o grafo de dependências é montado. Nem domain, nem application, nem controllers fazem `new` de classe de infra.

```ts
// src/interface/composition-root.ts
const pool = new Pool({ connectionString: env.DATABASE_URL });
const notaRepository = new PgNotaRepository(pool);
const empresaRepository = new PgEmpresaRepository(pool);
const sefazGateway = new SefazSPAdapter(env.SEFAZ_ENDPOINT);
const mailer = new MailerResend(env.RESEND_API_KEY);
const clock = new SystemClock();
const dispatcher = new InMemoryEventDispatcher();

export const emitirNFSeUseCase = new EmitirNFSeUseCase(
  notaRepository, empresaRepository, sefazGateway, clock, dispatcher,
);

export const emitirNFSeController = new EmitirNFSeController(emitirNFSeUseCase);
```

Para grafos que ficarem grandes, considerar um container (tsyringe, awilix) — decisão em aberto.
