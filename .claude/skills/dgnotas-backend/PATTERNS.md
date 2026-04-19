# Patterns — DGNotas Backend

Para cada pattern: **assinatura**, **exemplo completo funcional** usando entidades reais do domínio (Nota, Empresa, CNPJ, Certificado) e **anti-pattern** (como NÃO fazer).

Convenção destes exemplos:
- Usamos um `Result<T, E>` simples (ver fim deste arquivo). Implementação é opcional — você pode preferir throw puro. Escolha uma e mantenha.
- Classes-base `Entity`, `AggregateRoot`, `ValueObject` vivem em `src/domain/shared/`.

---

## Entity — `Nota`

Uma entity tem **identidade** (id estável) e **ciclo de vida**. Duas notas com o mesmo conteúdo mas ids diferentes são entities distintas.

### Assinatura

```ts
abstract class Entity<Props> {
  protected constructor(protected readonly props: Props, public readonly id: string) {}
  equals(other?: Entity<Props>): boolean {
    return !!other && other.id === this.id;
  }
}
```

### Exemplo completo

```ts
// src/domain/entities/nota.ts
import { AggregateRoot } from '../shared/aggregate-root';
import { Result } from '../shared/result';
import { CNPJ } from '../value-objects/cnpj';
import { ChaveAcesso } from '../value-objects/chave-acesso';
import { Money } from '../value-objects/money';
import { ItemDaNota } from './item-da-nota';
import { NotaEmitida } from '../events/nota-emitida';
import { NotaJaCanceladaError } from '../errors/nota-ja-cancelada-error';
import { PrazoDeCancelamentoExcedidoError } from '../errors/prazo-de-cancelamento-excedido-error';

export type StatusNota = 'rascunho' | 'processando' | 'autorizada' | 'rejeitada' | 'cancelada';

interface NotaProps {
  companyId: string;
  numero: number;
  serie: number;
  tipo: 'nfe' | 'nfse';
  status: StatusNota;
  emitenteCNPJ: CNPJ;
  tomadorCNPJ: CNPJ;
  itens: ItemDaNota[];
  chaveAcesso: ChaveAcesso | null;
  emitidaEm: Date | null;
  canceladaEm: Date | null;
  motivoCancelamento: string | null;
}

export class Nota extends AggregateRoot<NotaProps> {
  private constructor(props: NotaProps, id: string) {
    super(props, id);
    this.invariantes();
  }

  // factory para criação nova
  static create(input: {
    id: string;
    companyId: string;
    numero: number;
    serie: number;
    tipo: 'nfe' | 'nfse';
    emitenteCNPJ: CNPJ;
    tomadorCNPJ: CNPJ;
    itens: ItemDaNota[];
  }): Result<Nota> {
    if (input.itens.length === 0) {
      return Result.fail(new Error('nota sem itens'));
    }
    return Result.ok(new Nota({
      ...input,
      status: 'rascunho',
      chaveAcesso: null,
      emitidaEm: null,
      canceladaEm: null,
      motivoCancelamento: null,
    }, input.id));
  }

  // factory para reconstituição vinda do banco
  static reconstitute(props: NotaProps & { id: string }): Nota {
    const { id, ...rest } = props;
    return new Nota(rest, id);
  }

  get valorTotal(): Money {
    return this.props.itens.reduce((acc, i) => acc.add(i.valorTotal), Money.zero());
  }

  get status(): StatusNota { return this.props.status; }

  // regra de negócio vive AQUI, não no controller
  podeSerCancelada(agora: Date): Result<void> {
    if (this.props.status === 'cancelada') {
      return Result.fail(new NotaJaCanceladaError(this.id));
    }
    if (this.props.status !== 'autorizada' || !this.props.emitidaEm) {
      return Result.fail(new Error('só é possível cancelar nota autorizada'));
    }
    const PRAZO_MS = 24 * 60 * 60 * 1000;
    if (agora.getTime() - this.props.emitidaEm.getTime() > PRAZO_MS) {
      return Result.fail(new PrazoDeCancelamentoExcedidoError(this.id));
    }
    return Result.ok(undefined);
  }

  cancelar(input: { motivo: string; agora: Date }): Result<void> {
    const check = this.podeSerCancelada(input.agora);
    if (check.isFailure) return check;
    this.props.status = 'cancelada';
    this.props.canceladaEm = input.agora;
    this.props.motivoCancelamento = input.motivo;
    return Result.ok(undefined);
  }

  marcarComoAutorizada(input: { chave: ChaveAcesso; emitidaEm: Date }): void {
    this.props.status = 'autorizada';
    this.props.chaveAcesso = input.chave;
    this.props.emitidaEm = input.emitidaEm;
    this.addEvent(new NotaEmitida(this.id, this.props.companyId, input.chave.toString()));
  }

  private invariantes(): void {
    if (this.props.numero < 1) throw new Error('numero de nota inválido');
    if (this.props.serie < 1) throw new Error('serie de nota inválida');
  }
}
```

### Anti-pattern

```ts
// ❌ regra de negócio no controller
app.post('/notas/:id/cancelar', async (req, res) => {
  const nota = await db.query('SELECT * FROM notas WHERE id = $1', [req.params.id]);
  if (nota.status === 'cancelada') return res.status(409).json({ error: 'já cancelada' });
  if (Date.now() - nota.emitida_em > 24*60*60*1000) return res.status(409).json({ error: 'prazo' });
  await db.query('UPDATE notas SET status = $1 WHERE id = $2', ['cancelada', req.params.id]);
  res.status(204).end();
});
```

Problemas: regra espalhada no controller, SQL direto no handler, zero isolamento, impossível testar sem subir HTTP, `companyId` nem aparece (vaza dado entre empresas).

---

## Value Object — `CNPJ`

Um value object **não tem identidade** — é definido só pelos seus valores. Dois CNPJs com o mesmo número são o mesmo CNPJ. **Imutáveis.**

### Assinatura

```ts
abstract class ValueObject<Props> {
  protected constructor(protected readonly props: Props) { Object.freeze(this.props); }
  equals(other?: ValueObject<Props>): boolean {
    if (!other) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
```

### Exemplo completo

```ts
// src/domain/value-objects/cnpj.ts
import { ValueObject } from '../shared/value-object';
import { Result } from '../shared/result';
import { CNPJInvalidoError } from '../errors/cnpj-invalido-error';

export class CNPJ extends ValueObject<{ value: string }> {
  private constructor(value: string) { super({ value }); }

  static create(raw: string): Result<CNPJ, CNPJInvalidoError> {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 14) return Result.fail(new CNPJInvalidoError(raw));
    if (/^(\d)\1+$/.test(digits)) return Result.fail(new CNPJInvalidoError(raw));
    if (!CNPJ.checkDigit(digits)) return Result.fail(new CNPJInvalidoError(raw));
    return Result.ok(new CNPJ(digits));
  }

  private static checkDigit(digits: string): boolean {
    const calc = (base: string) => {
      const weights = base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const sum = base.split('').reduce((s, d, i) => s + Number(d) * weights[i], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const d1 = calc(digits.slice(0, 12));
    const d2 = calc(digits.slice(0, 12) + d1);
    return d1 === Number(digits[12]) && d2 === Number(digits[13]);
  }

  toString(): string { return this.props.value; }

  toFormatted(): string {
    const v = this.props.value;
    return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
  }
}
```

### Anti-pattern

```ts
// ❌ CNPJ como string crua espalhada pelo código
function emitirNota(emitenteCnpj: string) {
  if (emitenteCnpj.length !== 14) throw new Error('cnpj invalido');
  // ... validação reimplementada em cada lugar
}
```

Problemas: validação duplicada, tipo primitivo (`string`) não diz que é um CNPJ, formatos diferentes conviverão (`12.345...` vs `12345...`).

---

## Aggregate Root — `Nota` contendo `ItemDaNota`

Um **aggregate** é um cluster de entities/VOs que é tratado como uma unidade de consistência. O **root** é a única porta de entrada — ninguém de fora acessa os itens diretamente, só via `nota.adicionarItem(...)`.

### Regras

1. Transação sempre no nível do aggregate. Não dá pra salvar um `ItemDaNota` sozinho.
2. Repository existe só pro aggregate root (`NotaRepository`), nunca pras entities filhas.
3. Entities filhas só mudam de estado via métodos do root.

### Exemplo

```ts
// src/domain/entities/item-da-nota.ts
export class ItemDaNota extends Entity<{ produto: string; quantidade: number; valorUnitario: Money; ncm: NCM }> {
  get valorTotal(): Money {
    return this.props.valorUnitario.multiply(this.props.quantidade);
  }
}

// src/domain/entities/nota.ts (trecho)
export class Nota extends AggregateRoot<NotaProps> {
  adicionarItem(item: ItemDaNota): Result<void> {
    if (this.props.status !== 'rascunho') {
      return Result.fail(new Error('nota já emitida não aceita novos itens'));
    }
    this.props.itens.push(item);
    return Result.ok(undefined);
  }
}
```

### Anti-pattern

```ts
// ❌ ItemRepository + mutation direta de item
const item = await itemRepo.findById(id);
item.quantidade = 99; // nota nem fica sabendo
await itemRepo.save(item);
```

Problemas: invariante da nota (status = rascunho) é ignorada; o aggregate não é ouvido.

---

## Use Case — `EmitirNFSeUseCase`

Cada use case é **uma operação do sistema**. Um arquivo, uma classe, um método `execute(input)`.

### Assinatura

```ts
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Result<Output, DomainError | ApplicationError>>;
}
```

### Exemplo completo

```ts
// src/application/dtos/emitir-nfse-dto.ts
export interface EmitirNFSeInput {
  companyId: string;
  tomadorCNPJ: string;
  itens: Array<{ descricao: string; quantidade: number; valorUnitario: number; }>;
  serie: number;
}

export interface EmitirNFSeOutput {
  notaId: string;
  chaveAcesso: string;
  status: 'autorizada' | 'processando';
}
```

```ts
// src/application/use-cases/nota/emitir-nfse.use-case.ts
import { UseCase } from '../../shared/use-case';
import { NotaRepository } from '../../ports/nota-repository';
import { EmpresaRepository } from '../../ports/empresa-repository';
import { SefazGateway } from '../../ports/sefaz-gateway';
import { EventDispatcher } from '../../ports/event-dispatcher';
import { Clock } from '../../ports/clock';
import { NotFoundError } from '../../errors/not-found-error';
import { CNPJ, Nota, ItemDaNota, Money, NCM } from '../../../domain';
import { Result } from '../../../domain/shared/result';
import { EmitirNFSeInput, EmitirNFSeOutput } from '../../dtos/emitir-nfse-dto';

export class EmitirNFSeUseCase implements UseCase<EmitirNFSeInput, EmitirNFSeOutput> {
  constructor(
    private readonly notaRepo: NotaRepository,
    private readonly empresaRepo: EmpresaRepository,
    private readonly sefaz: SefazGateway,
    private readonly clock: Clock,
    private readonly dispatcher: EventDispatcher,
  ) {}

  async execute(input: EmitirNFSeInput): Promise<Result<EmitirNFSeOutput>> {
    // 1. resolver tenant
    const empresa = await this.empresaRepo.findById(input.companyId);
    if (!empresa) return Result.fail(new NotFoundError('empresa', input.companyId));

    // 2. validar VOs de entrada
    const tomadorResult = CNPJ.create(input.tomadorCNPJ);
    if (tomadorResult.isFailure) return Result.fail(tomadorResult.error);

    // 3. montar aggregate via domain
    const itens = input.itens.map(i => ItemDaNota.create({
      descricao: i.descricao,
      quantidade: i.quantidade,
      valorUnitario: Money.fromNumber(i.valorUnitario),
    }));

    const proximoNumero = await this.notaRepo.nextNumero(input.companyId, input.serie);
    const notaResult = Nota.create({
      id: crypto.randomUUID(),
      companyId: input.companyId,
      numero: proximoNumero,
      serie: input.serie,
      tipo: 'nfse',
      emitenteCNPJ: empresa.cnpj,
      tomadorCNPJ: tomadorResult.value,
      itens,
    });
    if (notaResult.isFailure) return Result.fail(notaResult.error);
    const nota = notaResult.value;

    // 4. delegar transmissão à infra
    const transmissao = await this.sefaz.enviarNFSe(nota, empresa);
    if (transmissao.isFailure) return Result.fail(transmissao.error);

    // 5. aplicar resultado no aggregate
    nota.marcarComoAutorizada({ chave: transmissao.value.chave, emitidaEm: this.clock.now() });

    // 6. persistir + eventos
    await this.notaRepo.save(nota);
    await this.dispatcher.dispatch(nota.pullEvents());

    return Result.ok({
      notaId: nota.id,
      chaveAcesso: nota.chaveAcesso!.toString(),
      status: 'autorizada',
    });
  }
}
```

### Anti-pattern

```ts
// ❌ use case fazendo SQL direto ou HTTP direto
export class EmitirNFSeUseCase {
  async execute(input) {
    const empresa = await pool.query('SELECT * FROM empresas WHERE id = $1', [input.companyId]);
    const response = await axios.post('https://nfe.fazenda.sp.gov.br/...', xml);
    await pool.query('INSERT INTO notas ...');
  }
}
```

Problemas: use case virou infra, impossível trocar banco ou SEFAZ sem reescrever use case, impossível testar sem rede.

---

## Repository — `NotaRepository`

**Interface** no `application/ports/`. **Implementação** no `infrastructure/database/`. Sempre escopa por `companyId`. Retorna entities do domínio, **não rows**.

### Interface

```ts
// src/application/ports/nota-repository.ts
import { Nota } from '../../domain/entities/nota';

export interface NotaRepository {
  save(nota: Nota): Promise<void>;
  findById(companyId: string, id: string): Promise<Nota | null>;
  findByChaveAcesso(companyId: string, chave: string): Promise<Nota | null>;
  nextNumero(companyId: string, serie: number): Promise<number>;
}
```

### Implementação

```ts
// src/infrastructure/database/repositories/pg-nota-repository.ts
import { Pool } from 'pg';
import { NotaRepository } from '../../../application/ports/nota-repository';
import { Nota } from '../../../domain/entities/nota';
import { notaMapper } from '../mappers/nota-mapper';

export class PgNotaRepository implements NotaRepository {
  constructor(private readonly pool: Pool) {}

  async save(nota: Nota): Promise<void> {
    const row = notaMapper.toPersistence(nota);
    await this.pool.query(
      `INSERT INTO notas_fiscais (id, empresa_id, numero, serie, tipo, status, ...)
       VALUES ($1, $2, $3, $4, $5, $6, ...)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, ...`,
      [row.id, row.empresa_id, row.numero, row.serie, row.tipo, row.status, /* ... */],
    );
    // itens_da_nota em transação — ver DATABASE.md
  }

  async findById(companyId: string, id: string): Promise<Nota | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM notas_fiscais WHERE id = $1 AND empresa_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );
    return rows[0] ? notaMapper.toDomain(rows[0]) : null;
  }

  async findByChaveAcesso(companyId: string, chave: string): Promise<Nota | null> { /* ... */ }

  async nextNumero(companyId: string, serie: number): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COALESCE(MAX(numero), 0) + 1 AS proximo
         FROM notas_fiscais WHERE empresa_id = $1 AND serie = $2`,
      [companyId, serie],
    );
    return rows[0].proximo;
  }
}
```

### Anti-pattern

```ts
// ❌ findById sem companyId — vaza dado entre empresas
async findById(id: string): Promise<Nota | null> {
  const { rows } = await this.pool.query(`SELECT * FROM notas_fiscais WHERE id = $1`, [id]);
  return rows[0] ? notaMapper.toDomain(rows[0]) : null;
}
```

```ts
// ❌ repository com regra de negócio
async save(nota: Nota): Promise<void> {
  if (Date.now() - nota.emitidaEm > 24*60*60*1000) {
    throw new Error('não pode cancelar'); // regra deveria estar na entity
  }
  // ...
}
```

```ts
// ❌ retornar row, não entity
async findById(id: string): Promise<{ empresa_id: string; status: string; /* ... */ }> {
  const { rows } = await this.pool.query(/* ... */);
  return rows[0]; // application agora depende de snake_case e tipos do banco
}
```

---

## Domain Event — `NotaEmitida`

Eventos expressam **algo que aconteceu no domínio**. Emitidos pela entity (no método que muda estado), capturados pelo use case ao persistir, despachados pelo dispatcher da infra.

### Evento

```ts
// src/domain/events/nota-emitida.ts
export class NotaEmitida {
  readonly type = 'nota.emitida' as const;
  readonly occurredAt = new Date();
  constructor(
    public readonly notaId: string,
    public readonly companyId: string,
    public readonly chaveAcesso: string,
  ) {}
}
```

### Entity emite

```ts
// dentro de Nota
marcarComoAutorizada(input: { chave: ChaveAcesso; emitidaEm: Date }): void {
  // ... muda estado
  this.addEvent(new NotaEmitida(this.id, this.props.companyId, input.chave.toString()));
}
```

### Use case despacha após salvar

```ts
await this.notaRepo.save(nota);
await this.dispatcher.dispatch(nota.pullEvents());
```

### Handler em infra

```ts
// src/infrastructure/events/handlers/enviar-email-nota-emitida.ts
export class EnviarEmailNotaEmitidaHandler implements EventHandler<NotaEmitida> {
  constructor(private readonly mailer: Mailer, private readonly empresaRepo: EmpresaRepository) {}

  async handle(event: NotaEmitida): Promise<void> {
    const empresa = await this.empresaRepo.findById(event.companyId);
    if (!empresa) return;
    await this.mailer.send({
      to: empresa.emailFinanceiro,
      subject: `Nota ${event.chaveAcesso} autorizada`,
      body: `...`,
    });
  }
}
```

### Anti-pattern

```ts
// ❌ use case enviando e-mail direto, acoplado
await this.notaRepo.save(nota);
await this.mailer.send(/* ... */);            // agora toda mudança no use case mexe com envio de e-mail
await this.slackNotifier.notify(/* ... */);   // e com Slack
await this.analytics.track(/* ... */);        // e com analytics
```

---

## Error handling

### Hierarquia

```ts
// src/domain/errors/domain-error.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
}

// src/domain/errors/cnpj-invalido-error.ts
export class CNPJInvalidoError extends DomainError {
  readonly code = 'CNPJ_INVALIDO';
  readonly httpStatus = 422;
  constructor(raw: string) { super(`CNPJ inválido: ${raw}`); }
}

// src/domain/errors/prazo-de-cancelamento-excedido-error.ts
export class PrazoDeCancelamentoExcedidoError extends DomainError {
  readonly code = 'PRAZO_CANCELAMENTO_EXCEDIDO';
  readonly httpStatus = 409;
  constructor(notaId: string) { super(`prazo de cancelamento excedido para nota ${notaId}`); }
}

// src/application/errors/application-error.ts
export abstract class ApplicationError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
}

export class NotFoundError extends ApplicationError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
  constructor(entity: string, id: string) { super(`${entity} ${id} não encontrado`); }
}
```

### Controller traduz

```ts
// src/interface/http/middlewares/error-handler.ts
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof DomainError || err instanceof ApplicationError) {
    return res.status(err.httpStatus).json({ code: err.code, message: err.message });
  }
  req.log.error({ err }, 'erro inesperado');
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'erro interno' });
}
```

### Anti-pattern

```ts
// ❌ throw genérico
throw new Error('CNPJ inválido');

// ❌ status HTTP na entity
throw { status: 422, message: 'CNPJ inválido' }; // domain não sabe HTTP

// ❌ string no catch
} catch (e) { if (e.message.includes('CNPJ')) /* ... */ }
```

---

## Result pattern (opcional mas recomendado)

Força o caller a lidar com falhas, sem throw. Especialmente útil em VOs (`CNPJ.create`) e para distinguir **erro esperado** (regra de negócio) de **exceção inesperada** (bug, rede caiu).

```ts
// src/domain/shared/result.ts
export class Result<T, E = Error> {
  private constructor(
    public readonly isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  get isFailure(): boolean { return !this.isSuccess; }

  get value(): T {
    if (!this.isSuccess) throw new Error('acessou value de Result com falha');
    return this._value as T;
  }

  get error(): E {
    if (this.isSuccess) throw new Error('acessou error de Result com sucesso');
    return this._error as E;
  }

  static ok<T, E = Error>(value: T): Result<T, E> { return new Result<T, E>(true, value); }
  static fail<T, E = Error>(error: E): Result<T, E> { return new Result<T, E>(false, undefined, error); }
}
```

**Convenção:**
- Erros **esperados de domínio** (regra violada, CNPJ inválido, prazo excedido) → `Result.fail(new DomainError(...))`.
- Erros **inesperados** (banco caiu, bug) → `throw` normal, pego pelo error handler do HTTP.

Mantenha uma convenção por projeto — misturar Result e throw no mesmo fluxo confunde.
