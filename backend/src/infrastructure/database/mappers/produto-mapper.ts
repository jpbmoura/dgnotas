import {
  Produto,
  type LocalIncidencia,
  type StatusItem,
  type TipoItem,
} from '../../../domain/entities/produto';
import { NCM } from '../../../domain/value-objects/ncm';

export interface ProdutoRow {
  id: string;
  empresa_id: string;
  tipo: TipoItem;
  codigo: string;
  nome: string;
  descricao: string;
  valor: string | number;
  status: StatusItem;
  cst_ibs_cbs: string;
  c_class_trib: string;
  // Produto
  unidade: string | null;
  ncm: string | null;
  gtin: string | null;
  sujeito_st: boolean | null;
  cest: string | null;
  origem: string | null;
  cfop: string | null;
  cst_or_csosn: string | null;
  aliq_icms: string | number | null;
  cst_pis: string | null;
  aliq_pis: string | number | null;
  cst_cofins: string | null;
  aliq_cofins: string | number | null;
  // Serviço
  lc116: string | null;
  ctiss: string | null;
  cnae_relacionado: string | null;
  aliq_iss: string | number | null;
  iss_retido: boolean | null;
  local_incidencia: LocalIncidencia | null;
  ret_pis_enabled: boolean | null;
  ret_pis_aliq: string | number | null;
  ret_cofins_enabled: boolean | null;
  ret_cofins_aliq: string | number | null;
  ret_csll_enabled: boolean | null;
  ret_csll_aliq: string | number | null;
  ret_irrf_enabled: boolean | null;
  ret_irrf_aliq: string | number | null;
  ret_inss_enabled: boolean | null;
  ret_inss_aliq: string | number | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
}

export const produtoMapper = {
  toDomain(row: ProdutoRow): Produto {
    const produtoConfig =
      row.tipo === 'produto'
        ? {
            unidade: row.unidade ?? '',
            ncm: row.ncm ? NCM.reconstitute(row.ncm) : null,
            gtin: row.gtin,
            sujeitoST: row.sujeito_st ?? false,
            cest: row.cest,
            origem: row.origem ?? '',
            cfop: row.cfop ?? '',
            cstOrCsosn: row.cst_or_csosn ?? '',
            aliqIcms: toNumber(row.aliq_icms) ?? 0,
            cstPis: row.cst_pis ?? '',
            aliqPis: toNumber(row.aliq_pis) ?? 0,
            cstCofins: row.cst_cofins ?? '',
            aliqCofins: toNumber(row.aliq_cofins) ?? 0,
          }
        : null;

    const servicoConfig =
      row.tipo === 'servico'
        ? {
            lc116: row.lc116 ?? '',
            ctiss: row.ctiss,
            cnaeRelacionado: row.cnae_relacionado,
            aliqIss: toNumber(row.aliq_iss) ?? 0,
            issRetido: row.iss_retido ?? false,
            localIncidencia: (row.local_incidencia ?? 'prestador') as LocalIncidencia,
            retPis: {
              enabled: row.ret_pis_enabled ?? false,
              aliq: toNumber(row.ret_pis_aliq) ?? 0,
            },
            retCofins: {
              enabled: row.ret_cofins_enabled ?? false,
              aliq: toNumber(row.ret_cofins_aliq) ?? 0,
            },
            retCsll: {
              enabled: row.ret_csll_enabled ?? false,
              aliq: toNumber(row.ret_csll_aliq) ?? 0,
            },
            retIrrf: {
              enabled: row.ret_irrf_enabled ?? false,
              aliq: toNumber(row.ret_irrf_aliq) ?? 0,
            },
            retInss: {
              enabled: row.ret_inss_enabled ?? false,
              aliq: toNumber(row.ret_inss_aliq) ?? 0,
            },
          }
        : null;

    return Produto.reconstitute({
      id: row.id,
      empresaId: row.empresa_id,
      tipo: row.tipo,
      codigo: row.codigo,
      nome: row.nome,
      descricao: row.descricao,
      valor: toNumber(row.valor) ?? 0,
      status: row.status,
      ibsCbs: {
        cstIbsCbs: row.cst_ibs_cbs,
        cClassTrib: row.c_class_trib,
      },
      produtoConfig,
      servicoConfig,
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
      deletedAt: row.deleted_at ? toDate(row.deleted_at) : null,
    });
  },
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' ? value : Number(value);
}
