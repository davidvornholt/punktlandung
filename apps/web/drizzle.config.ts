import { defineConfig } from 'drizzle-kit';

// Bewusst von src/shared/env.ts entkoppelt: Migrationen laufen auch im
// Deploy-Container, wo nur DATABASE_URL gesetzt ist (kein Auth-Env).
// Die db:*-Skripte laden .env.local via `bun --env-file`.
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL ist nicht gesetzt.');
}

export default defineConfig({
  out: './drizzle',
  schema: './src/shared/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
