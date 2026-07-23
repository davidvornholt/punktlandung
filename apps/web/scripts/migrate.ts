import { Effect } from 'effect';
import pg from 'pg';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import { preservePostgresDates } from '../src/shared/db/postgres-date.ts';

const databaseUrl = Bun.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === '') {
  throw new Error('DATABASE_URL ist nicht gesetzt.');
}

preservePostgresDates();
const migrationPool = new pg.Pool({ connectionString: databaseUrl });

await Effect.runPromise(
  migrateDatabase(migrationPool).pipe(
    Effect.ensuring(Effect.promise(() => migrationPool.end())),
  ),
);
