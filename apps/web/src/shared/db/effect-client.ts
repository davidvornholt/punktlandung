import { layer as pgDrizzleLayer } from '@effect/sql-drizzle/Pg';
import { PgClient } from '@effect/sql-pg';
import { Effect, Layer } from 'effect';

import { pool } from '#/shared/db/pool.ts';

const SqlLive = PgClient.layerFromPool({ acquire: Effect.succeed(pool) });

/** Stellt `PgDrizzle` für Effect-Services bereit. */
export const DatabaseLive = pgDrizzleLayer.pipe(Layer.provide(SqlLive));
