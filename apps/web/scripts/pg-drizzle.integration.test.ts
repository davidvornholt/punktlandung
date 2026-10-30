import { describe, expect, it } from 'bun:test';
import { sql as drizzleSql, eq } from 'drizzle-orm';
import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { Effect, Result } from 'effect';
import { SqlClient } from 'effect/sql/SqlClient';
import type { Pool } from 'pg';
import { PgDrizzle } from '#/shared/db/pg-drizzle.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const probeTable = pgTable('drizzle_probe', {
  id: text('id').primaryKey(),
  value: integer('value').notNull(),
});

const withProbeTable = <Value>(
  use: (
    provided: <A, E>(
      effect: Effect.Effect<A, E, SqlClient | PgDrizzle>,
    ) => Promise<A>,
    pool: Pool,
  ) => Promise<Value>,
): Promise<Value> =>
  withPostgresTestDatabase(async (pool) => {
    await pool.query(
      'CREATE TABLE drizzle_probe (id text PRIMARY KEY, value integer NOT NULL)',
    );
    const layer = postgresTestLayer(pool);
    return use(
      (effect) => Effect.runPromise(effect.pipe(Effect.provide(layer))),
      pool,
    );
  });

/** Liest über den pg-Pool, also außerhalb jeder Effect-Transaktion. */
const committedIds = async (pool: Pool): Promise<ReadonlyArray<string>> => {
  const { rows } = await pool.query<{ readonly id: string }>(
    'SELECT id FROM drizzle_probe ORDER BY id',
  );
  return rows.map(({ id }) => id);
};

const backendPid = (rows: ReadonlyArray<unknown>): unknown => {
  const [result] = rows as ReadonlyArray<{
    readonly rows: ReadonlyArray<{ readonly pid: unknown }>;
  }>;
  return result?.rows[0]?.pid;
};

/**
 * Fügt in einer Transaktion ein, schaut von innen und von außen nach und
 * bricht die Transaktion dann mit dem Gesehenen als Fehler ab.
 */
const failingInsert = (pool: Pool) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const db = yield* PgDrizzle;
    yield* db.insert(probeTable).values({ id: 'verworfen', value: 1 });
    const seen = yield* db.select({ id: probeTable.id }).from(probeTable);
    const outside = yield* Effect.promise(() => committedIds(pool));
    const [sqlPid] = yield* sql<{
      readonly pid: unknown;
    }>`SELECT pg_backend_pid() AS pid`;
    const drizzlePid = backendPid(
      yield* db.execute(drizzleSql`SELECT pg_backend_pid() AS pid`),
    );
    return yield* Effect.fail({
      seen,
      outside,
      sameConnection: drizzlePid === sqlPid?.pid,
    });
  });

const inTransaction = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.flatMap(Effect.service(SqlClient), (sql) =>
    sql.withTransaction(effect),
  );

const methodResults = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  // Ohne `returning` fragt Drizzle `execute` an.
  const insert = yield* db.insert(probeTable).values([
    { id: 'a', value: 1 },
    { id: 'b', value: 2 },
  ]);
  const raw = yield* db.execute(
    drizzleSql`SELECT id, value FROM drizzle_probe ORDER BY id`,
  );
  // Mit ausgewählten Feldern fragt Drizzle `all` an und ordnet die Zeilen
  // den Feldern zu, auch für eine einzelne Zeile.
  const selected = yield* db
    .select({ name: probeTable.id, wert: probeTable.value })
    .from(probeTable)
    .orderBy(probeTable.id);
  const single = yield* db
    .select()
    .from(probeTable)
    .where(eq(probeTable.id, 'b'))
    .limit(1);
  const updated = yield* db
    .update(probeTable)
    .set({ value: 3 })
    .where(eq(probeTable.id, 'a'))
    .returning({ value: probeTable.value });
  return { insert, raw, selected, single, updated };
});

const sleepingInsert = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  yield* db.insert(probeTable).values({ id: 'langsam', value: 1 });
  yield* db.execute(drizzleSql`SELECT pg_sleep(30)`);
});

const activeSleeps = async (pool: Pool): Promise<number | undefined> => {
  const { rows } = await pool.query<{ readonly count: number }>(
    `SELECT count(*)::int AS count FROM pg_stat_activity
     WHERE datname = current_database()
       AND state = 'active'
       AND query LIKE 'SELECT pg_sleep(30)%'`,
  );
  return rows[0]?.count;
};

describe('Drizzle über den Effect-SqlClient', () => {
  it('rollt eine Drizzle-Einfügung mit der fehlschlagenden Transaktion zurück', () =>
    withProbeTable(async (provided, pool) => {
      const outcome = await provided(
        inTransaction(failingInsert(pool)).pipe(Effect.result),
      );

      if (Result.isSuccess(outcome)) {
        throw new Error('Die Transaktion hätte fehlschlagen müssen.');
      }
      expect(outcome.failure).toEqual({
        seen: [{ id: 'verworfen' }],
        outside: [],
        sameConnection: true,
      });
      expect(await committedIds(pool)).toEqual([]);
    }));

  it('macht eine bestätigte Drizzle-Einfügung sichtbar', () =>
    withProbeTable(async (provided, pool) => {
      const inserted = await provided(
        Effect.flatMap(Effect.service(PgDrizzle), (db) =>
          inTransaction(
            db
              .insert(probeTable)
              .values({ id: 'bestaetigt', value: 2 })
              .returning({ id: probeTable.id, value: probeTable.value }),
          ),
        ),
      );

      expect(inserted).toEqual([{ id: 'bestaetigt', value: 2 }]);
      expect(await committedIds(pool)).toEqual(['bestaetigt']);
      expect(
        await provided(
          Effect.flatMap(Effect.service(PgDrizzle), (db) =>
            db.select().from(probeTable),
          ),
        ),
      ).toEqual([{ id: 'bestaetigt', value: 2 }]);
    }));

  it('liefert für execute das Treiberergebnis und für all zugeordnete Zeilen', () =>
    withProbeTable(async (provided) => {
      const results = await provided(methodResults);

      expect(results).toMatchObject({
        insert: [{ command: 'INSERT', rowCount: 2 }],
        raw: [
          {
            rows: [
              { id: 'a', value: 1 },
              { id: 'b', value: 2 },
            ],
          },
        ],
      });
      expect(results.selected).toEqual([
        { name: 'a', wert: 1 },
        { name: 'b', wert: 2 },
      ]);
      expect(results.single).toEqual([{ id: 'b', value: 2 }]);
      expect(results.updated).toEqual([{ value: 3 }]);
    }));

  it('bricht eine unterbrochene Drizzle-Anweisung in der Transaktion ab', () =>
    withProbeTable(async (provided, pool) => {
      const started = performance.now();
      const outcome = await provided(
        inTransaction(sleepingInsert).pipe(
          Effect.timeout('200 millis'),
          Effect.result,
        ),
      );

      expect(Result.isFailure(outcome)).toBe(true);
      expect(performance.now() - started).toBeLessThan(10_000);
      expect(await committedIds(pool)).toEqual([]);
      expect(await activeSleeps(pool)).toBe(0);
    }));
});
