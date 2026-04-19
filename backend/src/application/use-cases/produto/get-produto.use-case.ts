import type { ProdutoRepository } from '../../ports/produto-repository';
import type { ProdutoOutput } from '../../dtos/produto-dto';
import { produtoToOutput } from '../../dtos/produto-output.mapper';
import { NotFoundError } from '../../errors/application-error';

export class GetProdutoUseCase {
  constructor(private readonly produtoRepo: ProdutoRepository) {}

  async execute(params: {
    empresaId: string;
    produtoId: string;
  }): Promise<ProdutoOutput> {
    const produto = await this.produtoRepo.findByIdForEmpresa(
      params.empresaId,
      params.produtoId,
    );
    if (!produto) {
      throw new NotFoundError('produto', params.produtoId);
    }
    return produtoToOutput(produto);
  }
}
