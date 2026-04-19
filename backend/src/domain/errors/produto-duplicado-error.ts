import { DomainError } from './domain-error';

/**
 * Disparada quando a empresa tenta cadastrar dois produtos com o mesmo `codigo`.
 * Garantia última vem da unique index `uq_produtos_empresa_codigo` no banco,
 * mas o use case checa antes pra dar uma mensagem boa.
 */
export class ProdutoDuplicadoError extends DomainError {
  readonly code = 'PRODUTO_DUPLICADO';
  readonly httpStatus = 409;

  constructor(codigo: string) {
    super(`Já existe um produto com o código "${codigo}" nesta empresa.`);
  }
}
