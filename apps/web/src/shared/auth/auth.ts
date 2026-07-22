import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { drizzle } from 'drizzle-orm/node-postgres';

import { pool } from '#/shared/db/pool.ts';
import { account, session, user, verification } from '#/shared/db/schema.ts';
import { env } from '#/shared/env.ts';

const schema = { account, session, user, verification };
const db = drizzle(pool, { schema });

/**
 * Single-User-Auth: Anmeldung ausschließlich über GitHub, und nur der in
 * GITHUB_ALLOWED_LOGIN konfigurierte Account darf einen User anlegen.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({ name: profile.login }),
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: (candidate) => {
          if (candidate.name !== env.GITHUB_ALLOWED_LOGIN) {
            return Promise.reject(
              new APIError('FORBIDDEN', {
                message: 'Diese Anwendung ist privat.',
              }),
            );
          }
          return Promise.resolve({ data: candidate });
        },
      },
    },
  },
  plugins: [tanstackStartCookies()],
});
