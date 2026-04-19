import type { ProdutoRepository } from '../../ports/produto-repository';
import type { Clock } from '../../ports/clock';
import { NotFoundError } from '../../errors/application-error';

/**
 * Soft delete. A linha continua no banco (dado fiscal não se apaga) mas fica fora
 * das listagens e não bate mais na unique de `codigo` — permitindo o usuário
 * cadastrar outro produto com o mesmo código depois.
 */
export class DeleteProdutoUseCase {
  constructor(
    private readonly produtoRepo: ProdutoRepository,
    private readonly clock: Clock,
  ) {}

  async execute(params: {
    empresaId: string;
    produtoId: string;
  }): Promise<void> {
    const deleted = await this.produtoRepo.softDelete(
      params.empresaId,
      params.produtoId,
      this.clock.now(),
    );
    if (!deleted) {
      throw new NotFoundError('produto', params.produtoId);
    }
  }
}
