import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import type { Pool } from 'pg';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  applyMigrationsThrough0002,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const lockWaitTimeoutMs = 5000;
const testTimeoutMs = 15_000;

const runMigration = (pool: Pool) =>
  Effect.runPromise(Effect.either(migrateDatabase(pool)));

const waitForWaitingLock = (
  pool: Pool,
  relation: string,
  modes: ReadonlyArray<string>,
): Promise<string> => {
  const deadline = Date.now() + lockWaitTimeoutMs;
  const poll = async (): Promise<string> => {
    const result = await pool.query<{ readonly mode: string }>(
      `SELECT mode
       FROM pg_locks
       WHERE relation = $1::regclass
         AND granted = false
         AND mode = ANY($2::text[])
       ORDER BY mode
       LIMIT 1`,
      [relation, modes],
    );
    const mode = result.rows[0]?.mode;
    if (mode !== undefined) {
      return mode;
    }
    if (Date.now() >= deadline) {
      const waiting = await pool.query<{
        readonly relation: string | null;
        readonly mode: string;
        readonly granted: boolean;
        readonly query: string;
      }>(`
        SELECT
          relation::regclass::text AS relation,
          mode,
          granted,
          query
        FROM pg_locks
        JOIN pg_stat_activity USING (pid)
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
        ORDER BY pid, relation, mode
      `);
      throw new Error(
        `Keine wartende ${relation}-Sperre in den Modi ${modes.join(', ')} gefunden: ${JSON.stringify(waiting.rows)}`,
      );
    }
    await Bun.sleep(10);
    return poll();
  };
  return poll();
};

const waitForMigrationBarrier = (
  pool: Pool,
): Promise<{ readonly relation: string; readonly mode: string }> => {
  const deadline = Date.now() + lockWaitTimeoutMs;
  const poll = async (): Promise<{
    readonly relation: string;
    readonly mode: string;
  }> => {
    const result = await pool.query<{
      readonly relation: string;
      readonly mode: string;
    }>(`
      SELECT relation::regclass::text AS relation, mode
      FROM pg_locks
      WHERE granted = false
        AND (
          (relation = 'grade'::regclass AND mode = 'ShareLock')
          OR (
            relation IN (
              'grade'::regclass,
              'subject'::regclass,
              'school_year_subject'::regclass
            )
            AND mode = 'AccessExclusiveLock'
          )
        )
      ORDER BY relation, mode
      LIMIT 1
    `);
    const [lock] = result.rows;
    if (lock !== undefined) {
      return lock;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        'Die Migration erreichte keine erwartete Tabellensperre.',
      );
    }
    await Bun.sleep(10);
    return poll();
  };
  return poll();
};

const schemaState = async (pool: Pool) => {
  const result = await pool.query<{
    readonly tableName: string;
    readonly columnName: string;
  }>(`
    SELECT table_name AS "tableName", column_name AS "columnName"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('grade', 'subject', 'school_year_subject')
    ORDER BY table_name, ordinal_position
  `);
  return result.rows;
};

const migrationState = async (pool: Pool) => {
  const result = await pool.query<{
    readonly id: number;
    readonly hash: string;
    readonly createdAt: string;
  }>(`
    SELECT id, hash, created_at::text AS "createdAt"
    FROM drizzle.__drizzle_migrations
    ORDER BY id
  `);
  return result.rows;
};

const queryErrorMessage = (cause: unknown): string => {
  if (!(cause instanceof Error)) {
    throw new Error('Die Migration lieferte keinen Error als Ursache.');
  }
  const queryCause = cause.cause;
  if (!(queryCause instanceof Error)) {
    throw new Error('Der Migrationsfehler enthält keine Query-Ursache.');
  }
  return queryCause.message;
};

describe('Datenbankmigrationen unter konkurrierenden Schreibzugriffen', () => {
  it(
    'prüft eine nach der Bestandsabstimmung begonnene inkompatible Note unter Schreibsperre',
    () =>
      withPostgresTestDatabase(async (pool) => {
        await applyMigrationsThrough0002(pool);
        await pool.query(`
        INSERT INTO subject (id, name, short_name)
        VALUES ('mathe', 'Mathematik', 'M');
        INSERT INTO term (
          id, klassenstufe, school_year, half, system, starts_on, ends_on
        ) VALUES (
          'halbjahr', '10', '2026/27', 1, 'sechser',
          '2026-09-01', '2027-01-31'
        );
      `);
        const columnsBefore = await schemaState(pool);
        const migrationsBefore = await migrationState(pool);
        const gate = await pool.connect();
        const writer = await pool.connect();
        let gateOpen = false;
        let writerOpen = false;
        let writerInsert: Promise<unknown> | undefined;
        let migration: ReturnType<typeof runMigration> | undefined;
        try {
          await gate.query('BEGIN');
          gateOpen = true;
          await gate.query(
            'LOCK TABLE drizzle.__drizzle_migrations IN ACCESS EXCLUSIVE MODE',
          );

          migration = runMigration(pool);
          await waitForWaitingLock(pool, 'drizzle.__drizzle_migrations', [
            'AccessShareLock',
            'AccessExclusiveLock',
            'RowExclusiveLock',
            'ShareLock',
          ]);

          await writer.query('BEGIN');
          writerOpen = true;
          writerInsert = writer.query(`
          INSERT INTO grade (
            id, subject_id, term_id, kind, area, value, taken_on
          ) VALUES (
            'race-test', 'mathe', 'halbjahr', 'test', 'muendlich',
            1, '2026-09-01'
          )
        `);
          await writerInsert;

          await gate.query('COMMIT');
          gateOpen = false;
          const migrationLock = await waitForMigrationBarrier(pool);

          await writer.query('COMMIT');
          writerOpen = false;
          const result = await migration;
          expect({
            migrationLock,
            result: result._tag,
          }).toEqual({
            migrationLock: {
              relation: 'subject',
              mode: 'AccessExclusiveLock',
            },
            result: 'Left',
          });
          if (result._tag === 'Right') {
            throw new Error('Die Migration hätte abbrechen müssen.');
          }
          expect(queryErrorMessage(result.left.cause)).toContain('race-test');
          expect(await schemaState(pool)).toEqual(columnsBefore);
          expect(await migrationState(pool)).toEqual(migrationsBefore);
          const racingGrade = await pool.query<{
            readonly id: string;
            readonly area: string;
          }>('SELECT id, area::text AS area FROM grade WHERE id = $1', [
            'race-test',
          ]);
          expect(racingGrade.rows).toEqual([
            { id: 'race-test', area: 'muendlich' },
          ]);
        } finally {
          if (gateOpen) {
            await gate.query('ROLLBACK');
          }
          if (writerOpen) {
            await writer.query('ROLLBACK');
          }
          await writerInsert?.catch(() => undefined);
          await migration?.catch(() => undefined);
          gate.release();
          writer.release();
        }
      }),
    testTimeoutMs,
  );
});
