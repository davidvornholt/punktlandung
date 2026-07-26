import { describe, expect, it } from 'bun:test';
import type { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';
import type { Pool } from 'pg';
import {
  createHalbjahr,
  deleteHalbjahr,
  listHalbjahre,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import {
  createNote,
  deleteNote,
} from '#/features/noten/services/noten-service.ts';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const firstHalbjahr = {
  klassenstufe: '10' as const,
  schoolYear: '2026/27',
  half: 1 as const,
  startsOn: '2026-09-14',
  endsOn: '2027-01-29',
};

const secondHalbjahr = {
  ...firstHalbjahr,
  half: 2 as const,
  startsOn: '2027-02-01',
  endsOn: '2027-07-28',
};

type EffectRunner = <Value, Error>(
  effect: Effect.Effect<Value, Error, SqlClient | PgDrizzle>,
) => Promise<Value>;

/** Migrierte Testdatenbank mit einem Fach, aus dem der Fachstand entsteht. */
const withFach = (
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

const countRows = async (pool: Pool, query: string): Promise<number> => {
  const result = await pool.query<{ readonly count: string }>(query);
  return Number(result.rows[0]?.count ?? '0');
};

const fachstandRows = (pool: Pool): Promise<number> =>
  countRows(
    pool,
    `SELECT count(*)::text AS count FROM school_year_subject WHERE school_year = '2026/27'`,
  );

const fachstandMarker = (pool: Pool): Promise<number> =>
  countRows(
    pool,
    `SELECT count(*)::text AS count FROM school_year_subject_set WHERE school_year = '2026/27'`,
  );

const notenCount = (pool: Pool): Promise<number> =>
  countRows(pool, 'SELECT count(*)::text AS count FROM grade');

describe('Halbjahr löschen', () => {
  it('verweigert das Löschen, solange Noten am Halbjahr hängen', () =>
    withFach(async (provided, pool) => {
      await provided(createHalbjahr(firstHalbjahr));
      const [halbjahr] = await provided(listHalbjahre);
      if (halbjahr === undefined) {
        throw new Error('Angelegtes Halbjahr fehlt.');
      }
      await provided(
        createNote({
          termId: halbjahr.id,
          subjectId: 'mathe',
          kind: 'test',
          wert: 2,
          gewicht: 1,
          notiz: null,
          datum: firstHalbjahr.startsOn,
        }),
      );

      // Die Liste trägt die Anzahl, damit die Oberfläche das Löschen gar
      // nicht erst anbietet.
      expect((await provided(listHalbjahre))[0]?.notenCount).toBe(1);

      const rejection = await provided(
        Effect.flip(deleteHalbjahr(halbjahr.id)),
      );

      expect(rejection._tag).toBe('HalbjahrDeletionBlockedByNoten');
      // Der Fremdschlüssel kaskadiert; die Note beweist, dass er nie greift.
      expect(await notenCount(pool)).toBe(1);
      expect(await provided(listHalbjahre)).toHaveLength(1);

      const noten = await pool.query<{ readonly id: string }>(
        'SELECT id FROM grade',
      );
      const noteId = noten.rows[0]?.id;
      if (noteId === undefined) {
        throw new Error('Testnote fehlt.');
      }
      await provided(deleteNote(noteId));
      await provided(deleteHalbjahr(halbjahr.id));

      expect(await provided(listHalbjahre)).toHaveLength(0);
    }));

  it('meldet ein bereits gelöschtes Halbjahr als nicht gefunden', () =>
    withFach(async (provided) => {
      const missingError = await provided(
        Effect.flip(deleteHalbjahr('term-weg')),
      );

      expect(missingError._tag).toBe('HalbjahrNichtGefunden');
    }));

  it('gibt den Fachstand erst mit dem letzten Halbjahr eines Schuljahrs frei', () =>
    withFach(async (provided, pool) => {
      await provided(createHalbjahr(firstHalbjahr));
      await provided(createHalbjahr(secondHalbjahr));
      const halbjahre = await provided(listHalbjahre);
      const [second, first] = halbjahre;
      if (second === undefined || first === undefined) {
        throw new Error('Angelegte Halbjahre fehlen.');
      }
      expect(halbjahre.map((entry) => entry.notenCount)).toEqual([0, 0]);
      expect(await fachstandRows(pool)).toBe(1);

      await provided(deleteHalbjahr(second.id));

      expect(await fachstandRows(pool)).toBe(1);
      expect(await fachstandMarker(pool)).toBe(1);

      await provided(deleteHalbjahr(first.id));

      expect(await fachstandRows(pool)).toBe(0);
      expect(await fachstandMarker(pool)).toBe(0);
    }));
});
