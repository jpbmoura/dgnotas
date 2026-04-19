/**
 * Base de erros da camada de application (orquestração).
 * Cobre situações que não são regra de domínio mas também não são bug:
 * recurso inexistente, conflito de estado, falta de permissão.
 */
export abstract class ApplicationError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends ApplicationError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;

  constructor(entity: string, id: string) {
    super(`${entity} ${id} não encontrado`);
  }
}

export class ConflictError extends ApplicationError {
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;

  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedError extends ApplicationError {
  readonly code = 'UNAUTHORIZED';
  readonly httpStatus = 401;

  constructor(message = 'não autenticado') {
    super(message);
  }
}

export class ForbiddenError extends ApplicationError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;

  constructor(message = 'acesso negado') {
    super(message);
  }
}
