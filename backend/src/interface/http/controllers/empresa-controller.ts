import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createEmpresaBodySchema,
  updateEmpresaBodySchema,
} from '../validators/empresa-schemas';
import type { CreateEmpresaUseCase } from '../../../application/use-cases/empresa/create-empresa.use-case';
import type { UpdateEmpresaUseCase } from '../../../application/use-cases/empresa/update-empresa.use-case';
import type { GetEmpresaUseCase } from '../../../application/use-cases/empresa/get-empresa.use-case';
import type { ListEmpresasByOwnerUseCase } from '../../../application/use-cases/empresa/list-empresas-by-owner.use-case';
import { UnauthorizedError } from '../../../application/errors/application-error';

const empresaIdParamsSchema = z.object({
  id: z.string().uuid({ message: 'id da empresa deve ser UUID' }),
});

export class EmpresaController {
  constructor(
    private readonly createEmpresa: CreateEmpresaUseCase,
    private readonly updateEmpresa: UpdateEmpresaUseCase,
    private readonly getEmpresa: GetEmpresaUseCase,
    private readonly listEmpresas: ListEmpresasByOwnerUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const ownerUserId = extractOwnerUserId(req);
    const empresas = await this.listEmpresas.execute({ ownerUserId });
    res.status(200).json({ empresas });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ownerUserId = extractOwnerUserId(req);
    const body = createEmpresaBodySchema.parse(req.body);
    const empresa = await this.createEmpresa.execute({
      ownerUserId,
      ...body,
      inscricaoEstadual: body.inscricaoEstadual ?? null,
      inscricaoMunicipal: body.inscricaoMunicipal ?? null,
      endereco: {
        ...body.endereco,
        complemento: body.endereco.complemento ?? null,
      },
    });
    res.status(201).json(empresa);
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const ownerUserId = extractOwnerUserId(req);
    const { id } = empresaIdParamsSchema.parse(req.params);
    const empresa = await this.getEmpresa.execute({ ownerUserId, empresaId: id });
    res.status(200).json(empresa);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const ownerUserId = extractOwnerUserId(req);
    const { id } = empresaIdParamsSchema.parse(req.params);
    const body = updateEmpresaBodySchema.parse(req.body);
    const empresa = await this.updateEmpresa.execute({
      ownerUserId,
      empresaId: id,
      input: {
        ...body,
        inscricaoEstadual: body.inscricaoEstadual ?? null,
        inscricaoMunicipal: body.inscricaoMunicipal ?? null,
        endereco: {
          ...body.endereco,
          complemento: body.endereco.complemento ?? null,
        },
      },
    });
    res.status(200).json(empresa);
  };
}

function extractOwnerUserId(req: Request): string {
  const userId = req.auth?.user?.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
}
