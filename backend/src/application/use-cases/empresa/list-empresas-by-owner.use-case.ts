import type { EmpresaRepository } from '../../ports/empresa-repository';
import type { EmpresaOutput } from '../../dtos/empresa-dto';
import { empresaToOutput } from '../../dtos/empresa-output.mapper';

export class ListEmpresasByOwnerUseCase {
  constructor(private readonly empresaRepo: EmpresaRepository) {}

  async execute(params: { ownerUserId: string }): Promise<EmpresaOutput[]> {
    const empresas = await this.empresaRepo.findAllByOwner(params.ownerUserId);
    return empresas.map(empresaToOutput);
  }
}
