import type { Produto } from '../../domain/entities/produto';

export interface ProdutoRepository {
  /** Persiste (insert ou update, decidido pelo repositório pelo id). Soft delete via `softDelete`. */
  save(produto: Produto): Promise<void>;

  /** Carrega um produto pelo id, SOMENTE se pertencer à empresa informada. */
  findByIdForEmpresa(empresaId: string, id: string): Promise<Produto | null>;

  /** Lista todos os produtos da empresa (exclui soft-deletados). */
  findAllByEmpresa(empresaId: string): Promise<Produto[]>;

  /**
   * Checa se já existe produto com esse `codigo` para a mesma empresa.
   * `excludeId` é opcional — permite usar em update.
   */
  existsByEmpresaAndCodigo(
    empresaId: string,
    codigo: string,
    excludeId?: string,
  ): Promise<boolean>;

  /**
   * Soft delete. Marca `deleted_at = now` se o produto pertencer à empresa e ainda não estiver deletado.
   * Retorna `true` quando a linha foi marcada; `false` quando não existe, pertence a outra empresa
   * ou já estava deletado — o use case trata essas três situações uniformemente como "não encontrado".
   */
  softDelete(empresaId: string, id: string, now: Date): Promise<boolean>;
}
