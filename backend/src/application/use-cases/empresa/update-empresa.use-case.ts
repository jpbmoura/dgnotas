import type { EmpresaRepository } from '../../ports/empresa-repository';
import type { Clock } from '../../ports/clock';
import type { UpdateEmpresaInput, EmpresaOutput } from '../../dtos/empresa-dto';
import { empresaToOutput } from '../../dtos/empresa-output.mapper';
import type { Endereco } from '../../../domain/entities/empresa';
import { CNPJ } from '../../../domain/value-objects/cnpj';
import { CEP } from '../../../domain/value-objects/cep';
import { CNAE } from '../../../domain/value-objects/cnae';
import { EmpresaDuplicadaError } from '../../../domain/errors/empresa-duplicada-error';
import { NotFoundError } from '../../errors/application-error';
import type { Result } from '../../../domain/shared/result';

export class UpdateEmpresaUseCase {
  constructor(
    private readonly empresaRepo: EmpresaRepository,
    private readonly clock: Clock,
  ) {}

  async execute(params: {
    ownerUserId: string;
    empresaId: string;
    input: UpdateEmpresaInput;
  }): Promise<EmpresaOutput> {
    const { ownerUserId, empresaId, input } = params;

    const empresa = await this.empresaRepo.findByIdForOwner(ownerUserId, empresaId);
    if (!empresa) {
      throw new NotFoundError('empresa', empresaId);
    }

    const cnpj = unwrap(CNPJ.create(input.cnpj));
    const cep = unwrap(CEP.create(input.endereco.cep));
    const cnaePrincipal = unwrap(CNAE.create(input.cnaePrincipal));
    const cnaesSecundarios = input.cnaesSecundarios.map((c) => unwrap(CNAE.create(c)));

    if (cnpj.toString() !== empresa.cnpj.toString()) {
      const colisao = await this.empresaRepo.existsByOwnerAndCnpj(
        ownerUserId,
        cnpj.toString(),
        empresa.id,
      );
      if (colisao) {
        throw new EmpresaDuplicadaError(cnpj.toFormatted());
      }
    }

    const endereco: Endereco = {
      cep,
      logradouro: input.endereco.logradouro,
      numero: input.endereco.numero,
      complemento: nullIfBlank(input.endereco.complemento),
      bairro: input.endereco.bairro,
      municipio: input.endereco.municipio,
      uf: input.endereco.uf.toUpperCase(),
    };

    const certificado = input.certificado
      ? {
          fileName: input.certificado.fileName,
          issuer: input.certificado.issuer,
          holder: input.certificado.holder,
          validUntil: new Date(`${input.certificado.validUntil}T00:00:00Z`),
        }
      : null;

    empresa.atualizar({
      razaoSocial: input.razaoSocial,
      nomeFantasia: input.nomeFantasia,
      cnpj,
      isentoIE: input.isentoIE,
      inscricaoEstadual: input.inscricaoEstadual,
      inscricaoMunicipal: input.inscricaoMunicipal,
      cnaePrincipal,
      cnaesSecundarios,
      regimeTributario: input.regimeTributario,
      regimeEspecial: input.regimeEspecial,
      endereco,
      ambiente: input.ambiente,
      numeracao: input.numeracao,
      enviarEmailAutomatico: input.enviarEmailAutomatico,
      certificado,
      email: input.email,
      telefone: input.telefone,
      emailsRelatorios: input.emailsRelatorios,
      now: this.clock.now(),
    });

    await this.empresaRepo.save(empresa);

    return empresaToOutput(empresa);
  }
}

function unwrap<T>(result: Result<T, Error>): T {
  if (result.isFailure) throw result.error;
  return result.value;
}

function nullIfBlank(v: string | null): string | null {
  if (v === null) return null;
  const t = v.trim();
  return t === '' ? null : t;
}
