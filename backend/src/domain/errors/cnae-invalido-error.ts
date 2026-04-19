import { DomainError } from './domain-error';

export class CNAEInvalidoError extends DomainError {
  readonly code = 'CNAE_INVALIDO';
  readonly httpStatus = 422;

  constructor(raw: string) {
    super(`CNAE inválido: ${raw}. Formato esperado: XXXX-X/XX.`);
  }
}
