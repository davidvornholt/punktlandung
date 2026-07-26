import { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';
import type { Pool } from 'pg';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { sperreSchuljahrLifecycle } from '#/shared/noten/schuljahr-fachstand.ts';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const maximaleSperrversuche = 100;

export const vorjahr = {
  klassenstufe: '9' as const,
  schoolYear: '2025/26',
  half: 1 as const,
  startsOn: '2025-09-15',
  endsOn: '2026-01-30',
};

export const erstesHalbjahr = {
  klassenstufe: '10' as const,
  schoolYear: '2026/27',
  half: 1 as const,
  startsOn: '2026-09-14',
  endsOn: '2027-01-29',
};

export const zweitesHalbjahr = {
  ...erstesHalbjahr,
  half: 2 as const,
  startsOn: '2027-02-01',
  endsOn: '2027-07-28',
};

export const folgejahr = {
  ...erstesHalbjahr,
  schoolYear: '2027/28',
  startsOn: '2027-09-13',
  endsOn: '2028-01-28',
};

export type Ausfuehrung = <Value, Error>(
  effect: Effect.Effect<Value, Error, SqlClient | PgDrizzle>,
) => Promise<Value>;

export const mitFach = (
  verwende: (provided: Ausfuehrung, pool: Pool) => Promise<void>,
): Promise<void> =>
  withPostgresTestDatabase(async (pool) => {
    await Effect.runPromise(migrateDatabase(pool));
    await pool.query(
      `INSERT INTO subject (id, name, short_name, weighting)
       VALUES ('mathe', 'Mathematik', 'M', $1::jsonb);`,
      [JSON.stringify(standardgewichtung)],
    );
    const layer = postgresTestLayer(pool);
    await verwende(
      (effect) => Effect.runPromise(effect.pipe(Effect.provide(layer))),
      pool,
    );
  });

export const zaehle = async (
  pool: Pool,
  tabelle: 'term' | 'school_year_subject_set',
  schoolYear: string,
): Promise<number> => {
  const ergebnis = await pool.query<{ readonly anzahl: string }>(
    `SELECT count(*)::text AS anzahl FROM ${tabelle} WHERE school_year = $1`,
    [schoolYear],
  );
  return Number(ergebnis.rows[0]?.anzahl ?? '0');
};

const warteAufLifecycleSperren = async (
  pool: Pool,
  erwartet: number,
  verbleibendeVersuche: number,
): Promise<void> => {
  const ergebnis = await pool.query<{ readonly anzahl: string }>(
    `SELECT count(*)::text AS anzahl
     FROM pg_stat_activity
     WHERE datname = current_database()
       AND wait_event_type = 'Lock'
       AND wait_event = 'advisory'`,
  );
  if (Number(ergebnis.rows[0]?.anzahl ?? '0') >= erwartet) {
    return;
  }
  if (verbleibendeVersuche === 0) {
    throw new Error(
      `${erwartet} Lifecycle-Operationen erreichten die Testbarriere nicht.`,
    );
  }
  await Bun.sleep(10);
  await warteAufLifecycleSperren(pool, erwartet, verbleibendeVersuche - 1);
};

export const hinterLifecycleBarriere = async (
  pool: Pool,
  provided: Ausfuehrung,
  schoolYear: string,
  operationen: ReadonlyArray<() => Promise<void>>,
): Promise<void> => {
  let meldeBereit = (): void => undefined;
  let gibFrei = (): void => undefined;
  const bereit = new Promise<void>((resolve) => {
    meldeBereit = resolve;
  });
  const freigabe = new Promise<void>((resolve) => {
    gibFrei = resolve;
  });
  const sperre = provided(
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sperreSchuljahrLifecycle(schoolYear);
          yield* Effect.sync(meldeBereit);
          yield* Effect.promise(() => freigabe);
        }),
      );
    }),
  );
  await bereit;
  const laufend = operationen.map((operation) => operation());
  let barrierenfehler: unknown;
  try {
    await warteAufLifecycleSperren(
      pool,
      operationen.length,
      maximaleSperrversuche,
    );
  } catch (error) {
    barrierenfehler = error;
  } finally {
    gibFrei();
    await sperre;
  }
  await Promise.all(laufend);
  if (barrierenfehler !== undefined) {
    throw barrierenfehler;
  }
};
