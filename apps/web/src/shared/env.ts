import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/**
 * Serverseitige Konfiguration. Secrets kommen über `just dev-env-generate`
 * aus secrets/dev.yaml in .env.local (siehe apps/web/README.md).
 */
const minSecretLength = 32;

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(minSecretLength),
    BETTER_AUTH_URL: z.url().optional(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    /** Konfiguration, kein Secret: einziger zugelassener GitHub-Login. */
    GITHUB_ALLOWED_LOGIN: z.string().min(1).default('davidvornholt'),
  },
  clientPrefix: 'VITE_',
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
