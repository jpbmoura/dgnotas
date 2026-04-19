import { DomainError } from './domain-error';

export class CNPJInvalidoError extends DomainError {
  readonly code = 'CNPJ_INVALIDO';
  readonly httpStatus = 422;

  constructor(raw: string) {
    super(`CNPJ inválido: ${raw}`);
  }
}
