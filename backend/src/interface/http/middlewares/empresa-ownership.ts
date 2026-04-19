import type { Request, Response, NextFunction } from 'express';
import type { EmpresaRepository } from '../../../application/ports/empresa-repository';
import { NotFoundError, UnauthorizedError } from '../../../application/errors/application-error';

/**
 * Middleware que garante que o `:empresaId` vindo do path pertence ao usuário logado.
 * Deve ser usado em rotas aninhadas (ex: `/empresas/:empresaId/produtos`) depois de `requireAuth`.
 *
 * Retorna 404 quando a empresa não existe OU pertence a outro dono (não vazamos existência).
 */
export function createEmpresaOwnershipMiddleware(empresaRepo: EmpresaRepository) {
  return async function empresaOwnership(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const ownerUserId = req.auth?.user?.id;
      if (!ownerUserId) throw new UnauthorizedError();

      const empresaId = req.params.empresaId;
      if (!empresaId) {
        throw new Error('empresaId não presente na rota');
      }

      const empresa = await empresaRepo.findByIdForOwner(ownerUserId, empresaId);
      if (!empresa) {
        throw new NotFoundError('empresa', empresaId);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
