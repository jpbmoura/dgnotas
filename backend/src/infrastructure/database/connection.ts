import { Pool } from 'pg';
import { env } from '../../config/env';

/**
 * Pool PostgreSQL único e compartilhado pela aplicação.
 * Consumido pelos repositories e também pelo better-auth (em src/auth.ts).
 *
 * Tamanho do pool: 1.5x a 2x o número de CPUs do app server, respeitando o limite do banco.
 */
export const pool = new Pool({
  connectionString: env.databaseUrl,
  // Railway Postgres exige SSL na conexão pública; internamente também aceita.
  ssl: env.isProd ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'dgnotas-backend',
});

pool.on('error', (err) => {
  console.error('[pg] unexpected pool error:', err);
});
