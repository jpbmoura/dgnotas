import { betterAuth } from 'better-auth';
import { env } from './config/env';
import { pool } from './infrastructure/database/connection';

export const auth = betterAuth({
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

export type Session = typeof auth.$Infer.Session;
