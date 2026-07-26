import { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';
import type { Pool } from 'pg';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { lockSchoolYearLifecycle } from '#/shared/noten/school-year-fach-lifecycle.ts';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const maxLockAttempts = 100;

export const previousSchoolYearHalbjahr = {
  klassenstufe: '9' as const,
  schoolYear: '2025/26',
  half: 1 as const,
  startsOn: '2025-09-15',
  endsOn: '2026-01-30',
};

export const firstHalbjahr = {
  klassenstufe: '10' as const,
  schoolYear: '2026/27',
  half: 1 as const,
  startsOn: '2026-09-14',
  endsOn: '2027-01-29',
};

export const secondHalbjahr = {
  ...firstHalbjahr,
  half: 2 as const,
  startsOn: '2027-02-01',
  endsOn: '2027-07-28',
};

export const followingSchoolYearHalbjahr = {
  ...firstHalbjahr,
  schoolYear: '2027/28',
  startsOn: '2027-09-13',
  endsOn: '2028-01-28',
};

export type EffectRunner = <Value, Error>(
  effect: Effect.Effect<Value, Error, SqlClient | PgDrizzle>,
) => Promise<Value>;

export const withFach = (
  runTest: (provided: EffectRunner, pool: Pool) => Promise<void>,
): Promise<void> =>
  withPostgresTestDatabase(async (pool) => {
    await Effect.runPromise(migrateDatabase(pool));
    await pool.query(
      `INSERT INTO subject (id, name, short_name, weighting)
       VALUES ('mathe', 'Mathematik', 'M', $1::jsonb);`,
      [JSON.stringify(standardgewichtung)],
    );
    const layer = postgresTestLayer(pool);
    await runTest(
      (effect) => Effect.runPromise(effect.pipe(Effect.provide(layer))),
      pool,
    );
  });

export const countRows = async (
  pool: Pool,
  table: 'term' | 'school_year_subject_set',
  schoolYear: string,
): Promise<number> => {
  const result = await pool.query<{ readonly count: string }>(
    `SELECT count(*)::text AS count FROM ${table} WHERE school_year = $1`,
    [schoolYear],
  );
  return Number(result.rows[0]?.count ?? '0');
};

const waitForLifecycleLocks = async (
  pool: Pool,
  expected: number,
  remainingAttempts: number,
): Promise<void> => {
  const result = await pool.query<{ readonly count: string }>(
    `SELECT count(*)::text AS count
     FROM pg_stat_activity
     WHERE datname = current_database()
       AND wait_event_type = 'Lock'
       AND wait_event = 'advisory'`,
  );
  if (Number(result.rows[0]?.count ?? '0') >= expected) {
    return;
  }
  if (remainingAttempts === 0) {
    throw new Error(
      `${expected} Lifecycle-Operationen erreichten die Testbarriere nicht.`,
    );
  }
  await Bun.sleep(10);
  await waitForLifecycleLocks(pool, expected, remainingAttempts - 1);
};

const queueLifecycleOperations = async (
  pool: Pool,
  operations: ReadonlyArray<() => Promise<void>>,
  running: ReadonlyArray<Promise<void>> = [],
): Promise<ReadonlyArray<Promise<void>>> => {
  const operation = operations[running.length];
  if (operation === undefined) {
    return running;
  }
  const queued = [...running, operation()];
  await waitForLifecycleLocks(pool, queued.length, maxLockAttempts);
  return queueLifecycleOperations(pool, operations, queued);
};

export const behindLifecycleBarrier = async (
  pool: Pool,
  provided: EffectRunner,
  schoolYear: string,
  operations: ReadonlyArray<() => Promise<void>>,
): Promise<void> => {
  let signalReady = (): void => undefined;
  let release = (): void => undefined;
  const ready = new Promise<void>((resolve) => {
    signalReady = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const lock = provided(
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* lockSchoolYearLifecycle(schoolYear);
          yield* Effect.sync(signalReady);
          yield* Effect.promise(() => released);
        }),
      );
    }),
  );
  await ready;
  let running: ReadonlyArray<Promise<void>> = [];
  let barrierError: unknown;
  try {
    running = await queueLifecycleOperations(pool, operations);
  } catch (error) {
    barrierError = error;
  } finally {
    release();
    await lock;
  }
  await Promise.all(running);
  if (barrierError !== undefined) {
    throw barrierError;
  }
};
