import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/**
 * Serverseitige Konfiguration. Öffentliche Entwicklungswerte liegen in .env,
 * Secrets kommen über `just dev-env-generate` aus secrets/dev.yaml in
 * .env.local (siehe apps/web/README.md).
 */
const minSecretLength = 32;

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(minSecretLength),
    BETTER_AUTH_URL: z.url().optional(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    /** Positive dezimale GitHub-Account-ID des einzigen zugelassenen Kontos. */
    GITHUB_ALLOWED_ACCOUNT_ID: z.string().regex(/^[1-9]\d*$/u),
  },
  clientPrefix: 'VITE_',
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
