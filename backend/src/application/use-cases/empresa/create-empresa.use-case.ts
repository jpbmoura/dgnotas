import { randomUUID } from 'node:crypto';
import type { EmpresaRepository } from '../../ports/empresa-repository';
import type { Clock } from '../../ports/clock';
import type { CreateEmpresaInput, EmpresaOutput } from '../../dtos/empresa-dto';
import { empresaToOutput } from '../../dtos/empresa-output.mapper';
import { Empresa, type Endereco } from '../../../domain/entities/empresa';
import { CNPJ } from '../../../domain/value-objects/cnpj';
import { CEP } from '../../../domain/value-objects/cep';
import { CNAE } from '../../../domain/value-objects/cnae';
import { EmpresaDuplicadaError } from '../../../domain/errors/empresa-duplicada-error';
import type { Result } from '../../../domain/shared/result';

export class CreateEmpresaUseCase {
  constructor(
    private readonly empresaRepo: EmpresaRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateEmpresaInput): Promise<EmpresaOutput> {
    const cnpj = unwrap(CNPJ.create(input.cnpj));
    const cep = unwrap(CEP.create(input.endereco.cep));
    const cnaePrincipal = unwrap(CNAE.create(input.cnaePrincipal));
    const cnaesSecundarios = input.cnaesSecundarios.map((c) => unwrap(CNAE.create(c)));

    const jaExiste = await this.empresaRepo.existsByOwnerAndCnpj(
      input.ownerUserId,
      cnpj.toString(),
    );
    if (jaExiste) {
      throw new EmpresaDuplicadaError(cnpj.toFormatted());
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

    const empresa = Empresa.create({
      id: randomUUID(),
      ownerUserId: input.ownerUserId,
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
