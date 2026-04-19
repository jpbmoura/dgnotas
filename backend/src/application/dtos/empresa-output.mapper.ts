import type { Empresa } from '../../domain/entities/empresa';
import type { EmpresaOutput } from './empresa-dto';

/**
 * Converte uma entity `Empresa` no DTO que sai pro HTTP.
 * - CNPJ e CEP saem como dígitos puros (frontend formata).
 * - Datas viram ISO strings.
 * - Certificado fica null se não existir.
 */
export function empresaToOutput(empresa: Empresa): EmpresaOutput {
  return {
    id: empresa.id,
    ownerUserId: empresa.ownerUserId,
    razaoSocial: empresa.razaoSocial,
    nomeFantasia: empresa.nomeFantasia,
    cnpj: empresa.cnpj.toString(),
    inscricaoEstadual: empresa.inscricaoEstadual,
    inscricaoMunicipal: empresa.inscricaoMunicipal,
    cnaePrincipal: empresa.cnaePrincipal.toString(),
    cnaesSecundarios: empresa.cnaesSecundarios.map((c) => c.toString()),
    regimeTributario: empresa.regimeTributario,
    status: empresa.status,
    endereco: {
      cep: empresa.endereco.cep.toString(),
      logradouro: empresa.endereco.logradouro,
      numero: empresa.endereco.numero,
      complemento: empresa.endereco.complemento,
      bairro: empresa.endereco.bairro,
      municipio: empresa.endereco.municipio,
      uf: empresa.endereco.uf,
    },
    ambiente: empresa.ambiente,
    numeracao: { ...empresa.numeracao },
    enviarEmailAutomatico: empresa.enviarEmailAutomatico,
    certificado: empresa.certificado
      ? {
          fileName: empresa.certificado.fileName,
          issuer: empresa.certificado.issuer,
          holder: empresa.certificado.holder,
          validUntil: toIsoDate(empresa.certificado.validUntil),
        }
      : null,
    ultimaEmissaoEm: empresa.ultimaEmissaoEm
      ? empresa.ultimaEmissaoEm.toISOString()
      : null,
    createdAt: empresa.createdAt.toISOString(),
    updatedAt: empresa.updatedAt.toISOString(),
  };
}

function toIsoDate(d: Date): string {
  // Retorna apenas a parte yyyy-mm-dd (sem hora) — certificate validUntil é uma DATA, não timestamp.
  return d.toISOString().slice(0, 10);
}
