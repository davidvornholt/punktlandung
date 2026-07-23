import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Data, Effect } from 'effect';
import type { Pool } from 'pg';
import { reconcileLegacyData } from './legacy-reconciliation.ts';

export class DatabaseMigrationError extends Data.TaggedError(
  'DatabaseMigrationError',
)<{ readonly message: string; readonly cause: unknown }> {}

export const migrationFolder = decodeURIComponent(
  new URL('../../../drizzle', import.meta.url).pathname,
);

/** Bereinigt zulässige Alt-Duplikate und spielt danach generierte Migrationen ein. */
export const migrateDatabase = (pool: Pool) =>
  reconcileLegacyData(pool).pipe(
    Effect.andThen(
      Effect.tryPromise({
        try: () =>
          migrate(drizzle(pool), { migrationsFolder: migrationFolder }),
        catch: (cause) =>
          new DatabaseMigrationError({
            message: 'Die generierten Drizzle-Migrationen sind fehlgeschlagen.',
            cause,
          }),
      }),
    ),
  );
