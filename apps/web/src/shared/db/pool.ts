import pg from 'pg';

import { env } from '#/shared/env.ts';
import { preservePostgresDates } from './postgres-date.ts';

preservePostgresDates();

/**
 * Pool für Better Auth. Die Effect-Schicht spricht Postgres selbst und hält
 * eigene Verbindungen (`database-layer.ts`); beide zusammen bleiben bei den
 * zehn, die früher der gemeinsame Pool belegen durfte.
 */
const pgPoolSize = 4;

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: pgPoolSize,
});
