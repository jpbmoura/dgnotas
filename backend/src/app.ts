import path from 'path';
import express, { Router, type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import type { toNodeHandler as ToNodeHandlerFn } from 'better-auth/node';
import { env } from './config/env';
import { getAuth } from './auth';
import { dynamicImport } from './utils/dynamic-import';
import { healthRouter } from './routes/health';
import { invoicesRouter } from './routes/invoices';
import { requireAuth } from './middleware/require-auth';
import { errorHandler } from './interface/http/middlewares/error-handler';
import { empresasRouter } from './interface/http/routes/empresas-routes';
import { produtosRouter } from './interface/http/routes/produtos-routes';
import {
  empresaController,
  produtoController,
  empresaOwnershipMiddleware,
} from './interface/composition-root';

export async function createApp(): Promise<Express> {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
    }),
  );

  // better-auth é ESM-only; import dinâmico porque o backend compila pra CJS.
  const { toNodeHandler } = await dynamicImport<{ toNodeHandler: typeof ToNodeHandlerFn }>(
    'better-auth/node',
  );
  const auth = await getAuth();

  // Better Auth handler must be mounted BEFORE express.json (it reads raw body).
  app.all('/api/auth/*', toNodeHandler(auth));

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  const apiRouter = Router();

  apiRouter.get('/', (_req, res) => {
    res.json({ name: 'DG Notas API', version: '0.0.1', status: 'ok' });
  });

  apiRouter.use('/health', healthRouter);
  apiRouter.use('/invoices', requireAuth, invoicesRouter);
  apiRouter.use('/empresas', empresasRouter(empresaController));
  apiRouter.use(
    '/empresas/:empresaId/produtos',
    produtosRouter(produtoController, empresaOwnershipMiddleware),
  );

  app.use('/api', apiRouter);

  if (env.isProd) {
    // Em produção o backend serve a SPA buildada (mesmo host do API, sob /api).
    // Caminho a partir de backend/dist/app.js → ../../frontend/dist.
    const frontendDist = path.resolve(__dirname, '../../frontend/dist');
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
