import pg from 'pg';

import { env } from '#/shared/env.ts';
import { pgPoolSize } from './database-layer.ts';
import { preservePostgresDates } from './postgres-date.ts';

preservePostgresDates();

/** Pool für Better Auth; die Effect-Schicht hält eigene Verbindungen. */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: pgPoolSize,
});
