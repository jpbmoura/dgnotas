import type { Request, Response, NextFunction } from 'express';
import type { fromNodeHeaders as FromNodeHeadersFn } from 'better-auth/node';
import { getAuth, type Session } from '../auth';
import { UnauthorizedError } from '../application/errors/application-error';
import { dynamicImport } from '../utils/dynamic-import';

declare global {
  namespace Express {
    interface Request {
      auth?: Session;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    // better-auth é ESM-only; import dinâmico porque o backend compila pra CJS.
    // Node cacheia o módulo após o primeiro `import()`, então não há custo por request.
    const { fromNodeHeaders } = await dynamicImport<{
      fromNodeHeaders: typeof FromNodeHeadersFn;
    }>('better-auth/node');
    const auth = await getAuth();

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      throw new UnauthorizedError();
    }

    req.auth = session;
    return next();
  } catch (err) {
    return next(err);
  }
}
