import { createHash } from 'node:crypto';
import pg, { type Pool } from 'pg';
import { preservePostgresDates } from '../src/shared/db/postgres-date.ts';

const initialMigrationTimestamp = 1_784_738_851_477;

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

export const applyInitialMigration = async (pool: Pool): Promise<void> => {
  const migrationUrl = new URL(
    '../drizzle/0000_lucky_loa.sql',
    import.meta.url,
  );
  const migration = await Bun.file(migrationUrl).text();
  await pool.query('BEGIN');
  try {
    const executeStatements = async (
      statements: ReadonlyArray<string>,
    ): Promise<void> => {
      const [statement, ...remaining] = statements;
      if (statement !== undefined) {
        await pool.query(statement);
        await executeStatements(remaining);
      }
    };
    await executeStatements(migration.split('--> statement-breakpoint'));
    await pool.query('CREATE SCHEMA drizzle');
    await pool.query(`CREATE TABLE drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )`);
    await pool.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [
        createHash('sha256').update(migration).digest('hex'),
        initialMigrationTimestamp,
      ],
    );
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
};
