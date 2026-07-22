import { defineConfig } from 'drizzle-kit';

import { env } from './src/shared/env.ts';

// Aufruf über die db:*-Skripte, die .env.local via `bun --env-file` laden.
export default defineConfig({
  out: './drizzle',
  schema: './src/shared/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
