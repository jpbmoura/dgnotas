import { Router } from 'express';
import { requireAuth } from '../../../middleware/require-auth';
import type { EmpresaController } from '../controllers/empresa-controller';

/**
 * Rotas de Empresa. Todas exigem autenticação.
 * Escopo de dono é aplicado dentro dos use cases (via `ownerUserId` vindo da sessão).
 */
export function empresasRouter(controller: EmpresaController): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.put('/:id', controller.update);

  return router;
}
