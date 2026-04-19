import { Empresa, type Ambiente, type RegimeTributario, type StatusEmpresa } from '../../../domain/entities/empresa';
import { CNPJ } from '../../../domain/value-objects/cnpj';
import { CEP } from '../../../domain/value-objects/cep';
import { CNAE } from '../../../domain/value-objects/cnae';

export interface EmpresaRow {
  id: string;
  owner_user_id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  cnae_principal: string;
  cnaes_secundarios: string[];
  regime_tributario: RegimeTributario;
  status: StatusEmpresa;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  uf: string;
  ambiente: Ambiente;
  nfe_proximo_numero: number;
  nfe_serie: number;
  nfse_proximo_numero: number;
  nfse_serie: number;
  enviar_email_automatico: boolean;
  certificado_file_name: string | null;
  certificado_issuer: string | null;
  certificado_holder: string | null;
  certificado_valid_until: Date | string | null;
  ultima_emissao_em: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
}

export const empresaMapper = {
  toDomain(row: EmpresaRow): Empresa {
    const cnpj = CNPJ.reconstitute(row.cnpj);
    const cep = CEP.reconstitute(row.cep);
    const cnaePrincipal = CNAE.reconstitute(row.cnae_principal);
    const cnaesSecundarios = row.cnaes_secundarios.map((c) => CNAE.reconstitute(c));

    const certificado =
      row.certificado_file_name &&
      row.certificado_issuer &&
      row.certificado_holder &&
      row.certificado_valid_until
        ? {
            fileName: row.certificado_file_name,
            issuer: row.certificado_issuer,
            holder: row.certificado_holder,
            validUntil: toDate(row.certificado_valid_until),
          }
        : null;

    return Empresa.reconstitute({
      id: row.id,
      ownerUserId: row.owner_user_id,
      razaoSocial: row.razao_social,
      nomeFantasia: row.nome_fantasia,
      cnpj,
      inscricaoEstadual: row.inscricao_estadual,
      inscricaoMunicipal: row.inscricao_municipal,
      cnaePrincipal,
      cnaesSecundarios,
      regimeTributario: row.regime_tributario,
      status: row.status,
      endereco: {
        cep,
        logradouro: row.logradouro,
        numero: row.numero,
        complemento: row.complemento,
        bairro: row.bairro,
        municipio: row.municipio,
        uf: row.uf,
      },
      ambiente: row.ambiente,
      numeracao: {
        nfeProximoNumero: row.nfe_proximo_numero,
        nfeSerie: row.nfe_serie,
        nfseProximoNumero: row.nfse_proximo_numero,
        nfseSerie: row.nfse_serie,
      },
      enviarEmailAutomatico: row.enviar_email_automatico,
      certificado,
      ultimaEmissaoEm: row.ultima_emissao_em ? toDate(row.ultima_emissao_em) : null,
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      deletedAt: row.deleted_at ? toDate(row.deleted_at) : null,
    });
  },
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
