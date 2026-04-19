import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, type Session } from '../auth';
import { UnauthorizedError } from '../application/errors/application-error';

declare global {
  namespace Express {
    interface Request {
      auth?: Session;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
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
