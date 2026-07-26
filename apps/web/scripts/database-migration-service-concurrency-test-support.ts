import type { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';
import type { Pool, PoolClient } from 'pg';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import { postgresTestLayer } from './postgres-test-database.ts';

const lockWaitTimeoutMs = 5000;
const migrationLockCount = 3;

export const testTimeoutMs = 15_000;
export type FachRelation = 'subject' | 'school_year_subject';

export const note = {
  termId: 'halbjahr',
  subjectId: 'mathe',
  kind: 'test' as const,
  wert: 2,
  gewicht: 1,
  datum: '2026-09-01',
  notiz: null,
};

export const seedCurrentDatabase = async (
  pool: Pool,
  fachRelation: FachRelation = 'subject',
): Promise<void> => {
  await Effect.runPromise(migrateDatabase(pool));
  await pool.query(
    `INSERT INTO subject (id, name, short_name, weighting)
     VALUES ('mathe', 'Mathematik', 'M', $1::jsonb)`,
    [JSON.stringify(standardgewichtung)],
  );
  await pool.query(`
    INSERT INTO term (
      id, klassenstufe, school_year, half, system, starts_on, ends_on
    ) VALUES (
      'halbjahr', '10', '2026/27', 1, 'sechser',
      '2026-09-01', '2027-01-31'
    );
    INSERT INTO grade (
      id, subject_id, term_id, kind, value, weight, taken_on, note
    ) VALUES (
      'bestehend', 'mathe', 'halbjahr', 'test', 2, 1,
      '2026-09-01', null
    );
  `);
  if (fachRelation === 'school_year_subject') {
    await pool.query(
      `INSERT INTO school_year_subject (
         school_year, subject_id, name, short_name, weighting
       ) VALUES ('2026/27', 'mathe', 'Mathematik', 'M', $1::jsonb)`,
      [JSON.stringify(standardgewichtung)],
    );
    await pool.query(
      `INSERT INTO school_year_subject_set (school_year)
       VALUES ('2026/27')`,
    );
  }
};

const runService = (
  pool: Pool,
  operation: Effect.Effect<void, unknown, SqlClient | PgDrizzle>,
) => Effect.runPromise(operation.pipe(Effect.provide(postgresTestLayer(pool))));

const executeStatements = async (
  client: PoolClient,
  statements: ReadonlyArray<string>,
): Promise<void> => {
  const [statement, ...remaining] = statements;
  if (statement !== undefined) {
    await client.query(statement);
    await executeStatements(client, remaining);
  }
};

const runMigrationLockPrefix = async (pool: Pool): Promise<void> => {
  const migration = await Bun.file(
    new URL('../drizzle/0003_gewichtung_als_jsonb.sql', import.meta.url),
  ).text();
  const lockStatements = migration
    .split('--> statement-breakpoint')
    .slice(0, migrationLockCount);
  const client = await pool.connect();
  await client.query('BEGIN');
  try {
    await executeStatements(client, lockStatements);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const waitForLock = (pool: Pool, query: string): Promise<void> => {
  const deadline = Date.now() + lockWaitTimeoutMs;
  const poll = async (): Promise<void> => {
    const result = await pool.query<{ readonly ready: boolean }>(query);
    if (result.rows[0]?.ready === true) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Erwartete Sperre fehlt: ${query}`);
    }
    await Bun.sleep(10);
    return poll();
  };
  return poll();
};

const waitForServiceGradeWrite = (
  pool: Pool,
  fachRelation: FachRelation | null,
): Promise<void> =>
  waitForLock(
    pool,
    `SELECT EXISTS (
       SELECT 1
       FROM pg_locks grade_lock
       WHERE grade_lock.relation = 'grade'::regclass
         AND grade_lock.mode = 'RowExclusiveLock'
         AND grade_lock.granted = false
         ${
           fachRelation === null
             ? ''
             : `AND EXISTS (
                  SELECT 1
                  FROM pg_locks fach_lock
                  WHERE fach_lock.pid = grade_lock.pid
                    AND fach_lock.relation = '${fachRelation}'::regclass
                    AND fach_lock.mode = 'AccessShareLock'
                    AND fach_lock.granted = true
                )`
}
     ) AS ready`,
  );

const waitForMigrationLock = (
  pool: Pool,
  relation: FachRelation | 'grade',
  mode: 'AccessExclusiveLock' | 'ShareLock',
): Promise<void> =>
  waitForLock(
    pool,
    `SELECT EXISTS (
       SELECT 1
       FROM pg_locks
       WHERE relation = '${relation}'::regclass
         AND mode = '${mode}'
         AND granted = false
     ) AS ready`,
  );

export const raceServiceWithMigrationLocks = async (
  pool: Pool,
  operation: Effect.Effect<void, unknown, SqlClient | PgDrizzle>,
  fachRelation: FachRelation | null,
): Promise<ReadonlyArray<PromiseSettledResult<void>['status']>> => {
  const gate = await pool.connect();
  let gateOpen = false;
  let service: ReturnType<typeof runService> | undefined;
  let migrationLocks: Promise<void> | undefined;
  try {
    await gate.query('BEGIN');
    gateOpen = true;
    await gate.query('LOCK TABLE grade IN SHARE MODE');

    service = runService(pool, operation);
    await waitForServiceGradeWrite(pool, fachRelation);
    migrationLocks = runMigrationLockPrefix(pool);
    await waitForMigrationLock(
      pool,
      fachRelation ?? 'grade',
      fachRelation === null ? 'ShareLock' : 'AccessExclusiveLock',
    );

    await gate.query('COMMIT');
    gateOpen = false;
    const results = await Promise.allSettled([service, migrationLocks]);
    return results.map(({ status }) => status);
  } finally {
    if (gateOpen) {
      await gate.query('ROLLBACK');
    }
    await service?.catch(() => undefined);
    await migrationLocks?.catch(() => undefined);
    gate.release();
  }
};
