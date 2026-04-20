import { randomUUID } from 'node:crypto';
import type { ProdutoRepository } from '../../ports/produto-repository';
import type { Clock } from '../../ports/clock';
import type { CreateProdutoInput, ProdutoOutput } from '../../dtos/produto-dto';
import { produtoToOutput } from '../../dtos/produto-output.mapper';
import {
  Produto,
  type ProdutoConfig,
  type ServicoConfig,
} from '../../../domain/entities/produto';
import { NCM } from '../../../domain/value-objects/ncm';
import { ProdutoDuplicadoError } from '../../../domain/errors/produto-duplicado-error';
import type { Result } from '../../../domain/shared/result';

export class CreateProdutoUseCase {
  constructor(
    private readonly produtoRepo: ProdutoRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateProdutoInput): Promise<ProdutoOutput> {
    const jaExiste = await this.produtoRepo.existsByEmpresaAndCodigo(
      input.empresaId,
      input.codigo.trim(),
    );
    if (jaExiste) {
      throw new ProdutoDuplicadoError(input.codigo);
    }

    let produtoConfig: ProdutoConfig | null = null;
    let servicoConfig: ServicoConfig | null = null;

    if (input.tipo === 'produto') {
      if (!input.produtoConfig) {
        throw new Error('produtoConfig é obrigatório para tipo="produto"');
      }
      const cfg = input.produtoConfig;
      const ncm = cfg.ncm ? unwrap(NCM.create(cfg.ncm)) : null;
      produtoConfig = {
        unidade: cfg.unidade,
        ncm,
        cest: nullIfBlank(cfg.cest),
        origem: cfg.origem,
        cfop: cfg.cfop,
        cstOrCsosn: cfg.cstOrCsosn,
        aliqIcms: cfg.aliqIcms,
        cstIpi: cfg.cstIpi,
        aliqIpi: cfg.aliqIpi,
        cstPis: cfg.cstPis,
        aliqPis: cfg.aliqPis,
        cstCofins: cfg.cstCofins,
        aliqCofins: cfg.aliqCofins,
      };
    } else {
      if (!input.servicoConfig) {
        throw new Error('servicoConfig é obrigatório para tipo="servico"');
      }
      const cfg = input.servicoConfig;
      servicoConfig = {
        lc116: cfg.lc116,
        ctiss: nullIfBlank(cfg.ctiss),
        cnaeRelacionado: nullIfBlank(cfg.cnaeRelacionado),
        aliqIss: cfg.aliqIss,
        issRetido: cfg.issRetido,
        localIncidencia: cfg.localIncidencia,
        retPis: { ...cfg.retPis },
        retCofins: { ...cfg.retCofins },
        retCsll: { ...cfg.retCsll },
        retIrrf: { ...cfg.retIrrf },
        retInss: { ...cfg.retInss },
      };
    }

    const produto = Produto.create({
      id: randomUUID(),
      empresaId: input.empresaId,
      tipo: input.tipo,
      codigo: input.codigo,
      nome: input.nome,
      nomeFiscal: input.nomeFiscal,
      descricao: input.descricao,
      valor: input.valor,
      plataforma: input.plataforma,
      garantia: input.garantia,
      produtoConfig,
      servicoConfig,
      now: this.clock.now(),
    });

    await this.produtoRepo.save(produto);
    return produtoToOutput(produto);
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
