import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../../../domain/errors/domain-error';
import { ApplicationError } from '../../../application/errors/application-error';

/**
 * Error handler da camada de interface.
 * Traduz:
 *   DomainError / ApplicationError  → status (definido na classe) + { code, message }
 *   ZodError                        → 422 com { code, message, issues }
 *   qualquer outro erro             → 500 genérico, detalhe logado
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof DomainError || err instanceof ApplicationError) {
    return res.status(err.httpStatus).json({
      code: err.code,
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      code: 'VALIDATION_ERROR',
      message: 'payload inválido',
      issues: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  console.error('[error-handler] erro inesperado:', err);
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'erro interno',
  });
};
