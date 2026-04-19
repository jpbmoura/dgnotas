import { DomainError } from './domain-error';

export class CEPInvalidoError extends DomainError {
  readonly code = 'CEP_INVALIDO';
  readonly httpStatus = 422;

  constructor(raw: string) {
    super(`CEP inválido: ${raw}`);
  }
}
