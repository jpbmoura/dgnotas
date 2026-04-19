import { DomainError } from './domain-error';

/**
 * Disparada quando o mesmo dono tenta cadastrar o mesmo CNPJ duas vezes.
 * Garantia última vem da unique index `uq_empresas_owner_cnpj` no banco,
 * mas o use case checa antes pra dar uma mensagem boa.
 */
export class EmpresaDuplicadaError extends DomainError {
  readonly code = 'EMPRESA_DUPLICADA';
  readonly httpStatus = 409;

  constructor(cnpj: string) {
    super(`Já existe uma empresa cadastrada com o CNPJ ${cnpj}.`);
  }
}
