import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createProdutoBodySchema,
  updateProdutoBodySchema,
} from '../validators/produto-schemas';
import type { CreateProdutoUseCase } from '../../../application/use-cases/produto/create-produto.use-case';
import type { UpdateProdutoUseCase } from '../../../application/use-cases/produto/update-produto.use-case';
import type { GetProdutoUseCase } from '../../../application/use-cases/produto/get-produto.use-case';
import type { ListProdutosByEmpresaUseCase } from '../../../application/use-cases/produto/list-produtos-by-empresa.use-case';
import type { DeleteProdutoUseCase } from '../../../application/use-cases/produto/delete-produto.use-case';

const pathParamsSchema = z.object({
  empresaId: z.string().uuid({ message: 'empresaId deve ser UUID' }),
  id: z.string().uuid({ message: 'id do produto deve ser UUID' }).optional(),
});

export class ProdutoController {
  constructor(
    private readonly createProduto: CreateProdutoUseCase,
    private readonly updateProduto: UpdateProdutoUseCase,
    private readonly getProduto: GetProdutoUseCase,
    private readonly listProdutos: ListProdutosByEmpresaUseCase,
    private readonly deleteProduto: DeleteProdutoUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { empresaId } = pathParamsSchema.pick({ empresaId: true }).parse(req.params);
    const produtos = await this.listProdutos.execute({ empresaId });
    res.status(200).json({ produtos });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { empresaId } = pathParamsSchema.pick({ empresaId: true }).parse(req.params);
    const body = createProdutoBodySchema.parse(req.body);
    const produto = await this.createProduto.execute({
      empresaId,
      tipo: body.tipo,
      codigo: body.codigo,
      nome: body.nome,
      nomeFiscal: normalizeNomeFiscal(body.nomeFiscal),
      descricao: body.descricao,
      valor: body.valor,
      plataforma: body.plataforma ?? null,
      garantia: body.garantia ?? null,
      produtoConfig: normalizeProdutoConfig(body.produtoConfig),
      servicoConfig: normalizeServicoConfig(body.servicoConfig),
    });
    res.status(201).json(produto);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { empresaId, id } = pathParamsSchema.parse(req.params);
    const produto = await this.getProduto.execute({
      empresaId,
      produtoId: id as string,
    });
    res.status(200).json(produto);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { empresaId, id } = pathParamsSchema.parse(req.params);
    const body = updateProdutoBodySchema.parse(req.body);
    const produto = await this.updateProduto.execute({
      empresaId,
      produtoId: id as string,
      input: {
        codigo: body.codigo,
        nome: body.nome,
        nomeFiscal: normalizeNomeFiscal(body.nomeFiscal),
        descricao: body.descricao,
        valor: body.valor,
        status: body.status,
        plataforma: body.plataforma ?? null,
        garantia: body.garantia ?? null,
        produtoConfig: normalizeProdutoConfig(body.produtoConfig),
        servicoConfig: normalizeServicoConfig(body.servicoConfig),
      },
    });
    res.status(200).json(produto);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const { empresaId, id } = pathParamsSchema.parse(req.params);
    await this.deleteProduto.execute({
      empresaId,
      produtoId: id as string,
    });
    res.status(204).end();
  };
}

function normalizeNomeFiscal(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

function normalizeProdutoConfig(
  cfg: z.infer<typeof createProdutoBodySchema>['produtoConfig'],
) {
  if (!cfg) return null;
  return {
    unidade: cfg.unidade,
    ncm: cfg.ncm,
    cest: cfg.cest ?? null,
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
}

function normalizeServicoConfig(
  cfg: z.infer<typeof createProdutoBodySchema>['servicoConfig'],
) {
  if (!cfg) return null;
  return {
    lc116: cfg.lc116,
    ctiss: cfg.ctiss ?? null,
    cnaeRelacionado: cfg.cnaeRelacionado ?? null,
    aliqIss: cfg.aliqIss,
    issRetido: cfg.issRetido,
    localIncidencia: cfg.localIncidencia,
    retPis: cfg.retPis,
    retCofins: cfg.retCofins,
    retCsll: cfg.retCsll,
    retIrrf: cfg.retIrrf,
    retInss: cfg.retInss,
  };
}
