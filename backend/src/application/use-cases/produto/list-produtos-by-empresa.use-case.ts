import type { ProdutoRepository } from '../../ports/produto-repository';
import type { ProdutoOutput } from '../../dtos/produto-dto';
import { produtoToOutput } from '../../dtos/produto-output.mapper';

export class ListProdutosByEmpresaUseCase {
  constructor(private readonly produtoRepo: ProdutoRepository) {}

  async execute(params: { empresaId: string }): Promise<ProdutoOutput[]> {
    const produtos = await this.produtoRepo.findAllByEmpresa(params.empresaId);
    return produtos.map(produtoToOutput);
  }
}
