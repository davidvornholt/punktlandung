import { env } from '#/shared/env.ts';
import { databaseLayer } from './database-layer.ts';

/** Stellt Transaktionen und den darauf gebundenen Drizzle-Zugriff bereit. */
export const DatabaseLive = databaseLayer(env.DATABASE_URL);
