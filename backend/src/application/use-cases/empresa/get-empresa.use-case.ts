import type { EmpresaRepository } from '../../ports/empresa-repository';
import type { EmpresaOutput } from '../../dtos/empresa-dto';
import { empresaToOutput } from '../../dtos/empresa-output.mapper';
import { NotFoundError } from '../../errors/application-error';

export class GetEmpresaUseCase {
  constructor(private readonly empresaRepo: EmpresaRepository) {}

  async execute(params: {
    ownerUserId: string;
    empresaId: string;
  }): Promise<EmpresaOutput> {
    const empresa = await this.empresaRepo.findByIdForOwner(
      params.ownerUserId,
      params.empresaId,
    );
    if (!empresa) {
      throw new NotFoundError('empresa', params.empresaId);
    }
    return empresaToOutput(empresa);
  }
}
