import { layer as pgDrizzleLayer } from '@effect/sql-drizzle/Pg';
import { PgClient } from '@effect/sql-pg';
import { Effect, Layer } from 'effect';

import { pool } from '#/shared/db/pool.ts';

const SqlLive = PgClient.layerFromPool({ acquire: Effect.succeed(pool) });

/** Stellt Transaktionen und den darauf gebundenen Drizzle-Zugriff bereit. */
export const DatabaseLive = Layer.merge(
  SqlLive,
  pgDrizzleLayer.pipe(Layer.provide(SqlLive)),
);
