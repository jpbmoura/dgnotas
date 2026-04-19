import { Router } from 'express';

export const invoicesRouter = Router();

invoicesRouter.get('/', (_req, res) => {
  res.json({ items: [], total: 0 });
});

invoicesRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'not implemented' });
});
