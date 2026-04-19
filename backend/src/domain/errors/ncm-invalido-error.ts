import { DomainError } from './domain-error';

export class NCMInvalidoError extends DomainError {
  readonly code = 'NCM_INVALIDO';
  readonly httpStatus = 422;

  constructor(raw: string) {
    super(`NCM inválido: ${raw}. Esperados 8 dígitos.`);
  }
}
