import { createHash } from 'node:crypto';
import { layer as pgDrizzleLayer } from '@effect/sql-drizzle/Pg';
import { PgClient } from '@effect/sql-pg';
import { Effect, Layer } from 'effect';
import pg, { type Pool } from 'pg';
import { preservePostgresDates } from '../src/shared/db/postgres-date.ts';

type JournalEntry = { readonly tag: string; readonly when: number };

const journalEntries = async (): Promise<ReadonlyArray<JournalEntry>> => {
  const journal: { readonly entries: ReadonlyArray<JournalEntry> } =
    await Bun.file(
      new URL('../drizzle/meta/_journal.json', import.meta.url),
    ).json();
  return journal.entries;
};

const testDatabaseUrl = (): URL => {
  const configured = Bun.env.DATABASE_URL;
  if (configured !== undefined && configured !== '') {
    return new URL(configured);
  }
  const local = new URL('postgresql://127.0.0.1:15432/punktlandung_dev');
  local.username = 'punktlandung';
  local.password = 'punktlandung';
  return local;
};

const databaseName = (): string =>
  `punktlandung_test_${crypto.randomUUID().replaceAll('-', '')}`;

export const withPostgresTestDatabase = async <Value>(
  use: (pool: Pool) => Promise<Value>,
): Promise<Value> => {
  preservePostgresDates();
  const baseUrl = testDatabaseUrl();
  const adminUrl = new URL(baseUrl);
  adminUrl.pathname = '/postgres';
  const name = databaseName();
  const admin = new pg.Pool({ connectionString: adminUrl.href });
  await admin.query(`CREATE DATABASE "${name}"`);
  const isolatedUrl = new URL(baseUrl);
  isolatedUrl.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: isolatedUrl.href });
  try {
    return await use(pool);
  } finally {
    await pool.end();
    await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  }
};

/** SqlClient- und Drizzle-Schicht auf einer Testdatenbank, wie im Betrieb. */
export const postgresTestLayer = (pool: Pool) => {
  const sql = PgClient.layerFromPool({ acquire: Effect.succeed(pool) });
  return Layer.merge(sql, pgDrizzleLayer.pipe(Layer.provide(sql)));
};

const executeStatements = async (
  pool: Pool,
  statements: ReadonlyArray<string>,
): Promise<void> => {
  const [statement, ...remaining] = statements;
  if (statement !== undefined) {
    await pool.query(statement);
    await executeStatements(pool, remaining);
  }
};

const migrationText = (entry: JournalEntry): Promise<string> =>
  Bun.file(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url)).text();

/** Spielt eine Migration ein und verbucht sie so, wie Drizzle es täte. */
const applyRecordedMigration = async (
  pool: Pool,
  entry: JournalEntry,
): Promise<void> => {
  const migration = await migrationText(entry);
  await pool.query('BEGIN');
  try {
    await executeStatements(pool, migration.split('--> statement-breakpoint'));
    await pool.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await pool.query(`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )`);
    await pool.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [createHash('sha256').update(migration).digest('hex'), entry.when],
    );
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
};

const applyRecordedMigrations = async (
  pool: Pool,
  entries: ReadonlyArray<JournalEntry>,
): Promise<void> => {
  const [entry, ...remaining] = entries;
  if (entry !== undefined) {
    await applyRecordedMigration(pool, entry);
    await applyRecordedMigrations(pool, remaining);
  }
};

/** Baut den ausgelieferten Stand bis einschließlich der Migration `tag` auf. */
export const applyMigrationsThrough = async (
  pool: Pool,
  tag: string,
): Promise<void> => {
  const entries = await journalEntries();
  const last = entries.findIndex((entry) => entry.tag === tag);
  if (last === -1) {
    throw new Error(`Die Migration ${tag} steht nicht im Journal.`);
  }
  await applyRecordedMigrations(pool, entries.slice(0, last + 1));
};
