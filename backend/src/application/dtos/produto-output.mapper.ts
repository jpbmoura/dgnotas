import type { Produto } from '../../domain/entities/produto';
import type { ProdutoOutput } from './produto-dto';

export function produtoToOutput(p: Produto): ProdutoOutput {
  return {
    id: p.id,
    empresaId: p.empresaId,
    tipo: p.tipo,
    codigo: p.codigo,
    nome: p.nome,
    descricao: p.descricao,
    valor: p.valor,
    status: p.status,
    ibsCbs: { ...p.ibsCbs },
    produtoConfig: p.produtoConfig
      ? {
          unidade: p.produtoConfig.unidade,
          ncm: p.produtoConfig.ncm ? p.produtoConfig.ncm.toString() : null,
          gtin: p.produtoConfig.gtin,
          sujeitoST: p.produtoConfig.sujeitoST,
          cest: p.produtoConfig.cest,
          origem: p.produtoConfig.origem,
          cfop: p.produtoConfig.cfop,
          cstOrCsosn: p.produtoConfig.cstOrCsosn,
          aliqIcms: p.produtoConfig.aliqIcms,
          cstPis: p.produtoConfig.cstPis,
          aliqPis: p.produtoConfig.aliqPis,
          cstCofins: p.produtoConfig.cstCofins,
          aliqCofins: p.produtoConfig.aliqCofins,
        }
      : null,
    servicoConfig: p.servicoConfig
      ? {
          lc116: p.servicoConfig.lc116,
          ctiss: p.servicoConfig.ctiss,
          cnaeRelacionado: p.servicoConfig.cnaeRelacionado,
          aliqIss: p.servicoConfig.aliqIss,
          issRetido: p.servicoConfig.issRetido,
          localIncidencia: p.servicoConfig.localIncidencia,
          retPis: { ...p.servicoConfig.retPis },
          retCofins: { ...p.servicoConfig.retCofins },
          retCsll: { ...p.servicoConfig.retCsll },
          retIrrf: { ...p.servicoConfig.retIrrf },
          retInss: { ...p.servicoConfig.retInss },
        }
      : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
