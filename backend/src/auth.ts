import type { betterAuth as BetterAuthFn } from 'better-auth';
import { env } from './config/env';
import { pool } from './infrastructure/database/connection';
import { dynamicImport } from './utils/dynamic-import';

/**
 * better-auth é ESM-only — o backend compila pra CommonJS, então importamos
 * dinamicamente e cacheamos a instância. `getAuth()` é idempotente.
 */

async function buildAuth() {
  const mod = await dynamicImport<{ betterAuth: typeof BetterAuthFn }>('better-auth');
  return mod.betterAuth({
    database: pool,
    secret: env.betterAuthSecret,
    baseURL: env.betterAuthUrl,
    basePath: '/api/auth',
    trustedOrigins: [env.frontendOrigin],
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: env.isProd ? 'none' : 'lax',
        secure: env.isProd,
      },
    },
  });
}

export type AuthInstance = Awaited<ReturnType<typeof buildAuth>>;
export type Session = AuthInstance['$Infer']['Session'];

let _auth: AuthInstance | null = null;

export async function getAuth(): Promise<AuthInstance> {
  if (_auth) return _auth;
  _auth = await buildAuth();
  return _auth;
}
