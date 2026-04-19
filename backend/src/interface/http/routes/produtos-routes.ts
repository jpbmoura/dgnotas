import { Router, type RequestHandler } from 'express';
import { requireAuth } from '../../../middleware/require-auth';
import type { ProdutoController } from '../controllers/produto-controller';

/**
 * Rotas de Produto aninhadas sob `/empresas/:empresaId/produtos`.
 *
 * `mergeParams: true` é essencial — sem isso, `req.params.empresaId` chega undefined
 * pros handlers montados neste router.
 *
 * Ordem dos middlewares: auth → ownership (valida `:empresaId` pertence ao dono) → handler.
 */
export function produtosRouter(
  controller: ProdutoController,
  empresaOwnershipMiddleware: RequestHandler,
): Router {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);
  router.use(empresaOwnershipMiddleware);

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.get);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}
