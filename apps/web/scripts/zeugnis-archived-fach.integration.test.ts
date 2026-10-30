import { describe, expect, it } from 'bun:test';
import type { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';
import type { Pool } from 'pg';

import { loadZeugnis } from '#/features/zeugnis/services/zeugnis-service.ts';
import { migrateDatabase } from '#/shared/db/migrate.ts';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const schoolYear = '2026/27';
const ersterTermId = 'hj-1';
const zweiterTermId = 'hj-2';

const faecher = [
  { id: 'mathe', name: 'Mathematik', archived: false },
  { id: 'deutsch', name: 'Deutsch', archived: false },
  { id: 'latein', name: 'Latein', archived: true },
  { id: 'spanisch', name: 'Spanisch', archived: true },
  { id: 'geschichte', name: 'Geschichte', archived: true },
] as const;

const noten = [
  { id: 'mathe-1', fach: 'mathe', termId: ersterTermId, value: '2.00' },
  { id: 'latein-1', fach: 'latein', termId: ersterTermId, value: '3.00' },
  { id: 'latein-2', fach: 'latein', termId: ersterTermId, value: '4.00' },
  { id: 'spanisch-1', fach: 'spanisch', termId: zweiterTermId, value: '3.00' },
  { id: 'geschichte-1', fach: 'geschichte', termId: ersterTermId, value: null },
] as const;

type Provided = <Value, Error>(
  effect: Effect.Effect<Value, Error, SqlClient | PgDrizzle>,
) => Promise<Value>;

const seed = async (pool: Pool): Promise<void> => {
  await pool.query(
    `INSERT INTO term (id, klassenstufe, school_year, half, system, starts_on, ends_on)
     VALUES ($1, '10', $3, 1, 'sechser', '2026-09-14', '2027-01-29'),
            ($2, '10', $3, 2, 'sechser', '2027-02-01', '2027-07-29')`,
    [ersterTermId, zweiterTermId, schoolYear],
  );
  await Promise.all(
    faecher.map((fach, index) =>
      pool.query(
        `INSERT INTO subject (id, name, short_name, weighting, sort_order)
         VALUES ($1, $2, $1, $3, $4)`,
        [fach.id, fach.name, standardgewichtung, index],
      ),
    ),
  );
  await Promise.all(
    faecher.map((fach, index) =>
      pool.query(
        `INSERT INTO school_year_subject
           (school_year, subject_id, name, short_name, weighting, sort_order, archived)
         VALUES ($1, $2, $3, $2, $4, $5, $6)`,
        [
          schoolYear,
          fach.id,
          fach.name,
          standardgewichtung,
          index,
          fach.archived,
        ],
      ),
    ),
  );
  await pool.query(
    'INSERT INTO school_year_subject_set (school_year) VALUES ($1)',
    [schoolYear],
  );
  await Promise.all(
    noten.map((note) =>
      pool.query(
        `INSERT INTO grade (id, subject_id, term_id, kind, value, weight, taken_on)
         VALUES ($1, $2, $3, 'klausur', $4, '1.00', '2026-10-01')`,
        [note.id, note.fach, note.termId, note.value],
      ),
    ),
  );
};

const withSeededDatabase = <Value>(
  use: (provided: Provided) => Promise<Value>,
): Promise<Value> =>
  withPostgresTestDatabase(async (pool) => {
    await Effect.runPromise(migrateDatabase(pool));
    await seed(pool);
    const layer = postgresTestLayer(pool);
    const provided: Provided = (effect) =>
      Effect.runPromise(effect.pipe(Effect.provide(layer)));
    return use(provided);
  });

describe('Archivierte Fächer im Zeugnis', () => {
  it('führt ein archiviertes Fach mit Noten im Halbjahr und lässt eines ohne Noten weg', () =>
    withSeededDatabase(async (provided) => {
      const zeugnis = await provided(loadZeugnis(ersterTermId));

      expect(zeugnis.zeilen).toEqual([
        {
          fachId: 'mathe',
          fachName: 'Mathematik',
          archived: false,
          anzeige: '2',
          anzahlNoten: 1,
        },
        {
          fachId: 'deutsch',
          fachName: 'Deutsch',
          archived: false,
          anzeige: null,
          anzahlNoten: 0,
        },
        {
          fachId: 'latein',
          fachName: 'Latein',
          archived: true,
          anzeige: '3-4',
          anzahlNoten: 2,
        },
      ]);
      expect(zeugnis.gesamtschnitt).toBe('2,75');
    }));

  it('zeigt ein archiviertes Fach in dem Halbjahr, in dem es Noten hat', () =>
    withSeededDatabase(async (provided) => {
      const zeugnis = await provided(loadZeugnis(zweiterTermId));

      expect(
        zeugnis.zeilen.map((zeile) => [zeile.fachId, zeile.archived]),
      ).toEqual([
        ['mathe', false],
        ['deutsch', false],
        ['spanisch', true],
      ]);
      expect(zeugnis.gesamtschnitt).toBe('3');
    }));

  it('rechnet archivierte Fächer mit Noten im Schuljahr in die Jahresvorschau', () =>
    withSeededDatabase(async (provided) => {
      const erstes = await provided(loadZeugnis(ersterTermId));
      const zweites = await provided(loadZeugnis(zweiterTermId));

      expect(erstes.jahresvorschau).toEqual([
        {
          fachId: 'mathe',
          fachName: 'Mathematik',
          archived: false,
          note: 2,
          grenzfall: false,
        },
        {
          fachId: 'latein',
          fachName: 'Latein',
          archived: true,
          note: 4,
          grenzfall: true,
        },
        {
          fachId: 'spanisch',
          fachName: 'Spanisch',
          archived: true,
          note: 3,
          grenzfall: false,
        },
      ]);
      expect(zweites.jahresvorschau).toEqual(erstes.jahresvorschau);
    }));
});
