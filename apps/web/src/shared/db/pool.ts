import pg from 'pg';

import { env } from '#/shared/env.ts';
import { preservePostgresDates } from './postgres-date.ts';

preservePostgresDates();

/** Ein Prozess, ein Pool: Better Auth und die Effect-Schicht teilen ihn. */
export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
