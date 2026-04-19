/**
 * Base de erros do domínio.
 * Cada erro específico define seu `code` (string estável consumida pelo frontend)
 * e `httpStatus` (usado pelo error handler da camada de interface).
 *
 * Regra: domain NUNCA faz `throw new Error(...)`. Sempre uma subclasse de DomainError
 * (ou um Result.fail(new DomainError(...))).
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
