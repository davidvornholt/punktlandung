import { describe, expect, it } from 'bun:test';
import type { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';
import type { Pool } from 'pg';

import {
  createNote,
  updateNote,
} from '#/features/noten/services/noten-service.ts';
import { migrateDatabase } from '#/shared/db/migrate.ts';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const schoolYear = '2026/27';
const termId = 'hj-1';
const noteId = 'note-1';

/** Zwei archivierte Fächer und eines, das die Lehrkraft weiter führt. */
const faecher = [
  { id: 'latein', archived: true },
  { id: 'geschichte', archived: true },
  { id: 'biologie', archived: false },
] as const;

const fields = {
  kind: 'klausur',
  wert: 2,
  gewicht: 1,
  datum: '2026-10-01',
  notiz: null,
} as const;

type Provided = <Value, Error>(
  effect: Effect.Effect<Value, Error, SqlClient | PgDrizzle>,
) => Promise<Value>;

const seed = async (pool: Pool): Promise<void> => {
  await pool.query(
    `INSERT INTO term (id, klassenstufe, school_year, half, system, starts_on, ends_on)
     VALUES ($1, '10', $2, 1, 'sechser', '2026-09-14', '2027-01-29')`,
    [termId, schoolYear],
  );
  await Promise.all(
    faecher.map((fach) =>
      pool.query(
        `INSERT INTO subject (id, name, short_name, weighting, sort_order)
         VALUES ($1, $1, $1, $2, 0)`,
        [fach.id, standardgewichtung],
      ),
    ),
  );
  await Promise.all(
    faecher.map((fach) =>
      pool.query(
        `INSERT INTO school_year_subject
           (school_year, subject_id, name, short_name, weighting, sort_order, archived)
         VALUES ($1, $2, $2, $2, $3, 0, $4)`,
        [schoolYear, fach.id, standardgewichtung, fach.archived],
      ),
    ),
  );
  await pool.query(
    'INSERT INTO school_year_subject_set (school_year) VALUES ($1)',
    [schoolYear],
  );
  await pool.query(
    `INSERT INTO grade (id, subject_id, term_id, kind, value, weight, taken_on)
     VALUES ($1, 'latein', $2, 'klausur', '3.00', '1.00', '2026-10-01')`,
    [noteId, termId],
  );
};

const withSeededDatabase = <Value>(
  use: (provided: Provided, pool: Pool) => Promise<Value>,
): Promise<Value> =>
  withPostgresTestDatabase(async (pool) => {
    await Effect.runPromise(migrateDatabase(pool));
    await seed(pool);
    const layer = postgresTestLayer(pool);
    const provided: Provided = (effect) =>
      Effect.runPromise(effect.pipe(Effect.provide(layer)));
    return use(provided, pool);
  });

const storedNote = async (pool: Pool) => {
  const rows = await pool.query<{
    readonly subjectId: string;
    readonly value: string;
  }>('SELECT subject_id AS "subjectId", value FROM grade WHERE id = $1', [
    noteId,
  ]);
  return rows.rows[0];
};

const gradeCount = async (pool: Pool): Promise<string | undefined> => {
  const rows = await pool.query<{ readonly count: string }>(
    'SELECT count(*) AS count FROM grade',
  );
  return rows.rows[0]?.count;
};

describe('Noten an einem archivierten Fach', () => {
  /**
   * Wird ein Fach archiviert, hängen seine Noten weiter daran. Verlangte das
   * Speichern ein geführtes Fach, wäre jede dieser Noten dauerhaft
   * unkorrigierbar — genau das darf `updateNote` nicht tun.
   */
  it('bleibt am eigenen archivierten Fach korrigierbar, zieht aber in kein anderes um', () =>
    withSeededDatabase(async (provided, pool) => {
      await provided(
        updateNote({ ...fields, id: noteId, subjectId: 'latein' }),
      );
      expect(await storedNote(pool)).toEqual({
        subjectId: 'latein',
        value: '2.00',
      });

      const blocked = await provided(
        Effect.flip(
          updateNote({ ...fields, id: noteId, subjectId: 'geschichte' }),
        ),
      );
      expect(blocked._tag).toBe('FachNichtImSchuljahr');
      expect((await storedNote(pool))?.subjectId).toBe('latein');

      await provided(
        updateNote({ ...fields, id: noteId, subjectId: 'biologie' }),
      );
      expect((await storedNote(pool))?.subjectId).toBe('biologie');
    }));

  /**
   * Die Ausnahme gilt nur für die Note, die schon dranhängt: eine neue Note
   * darf nie in einem archivierten Fach landen.
   */
  it('nimmt keine neu eingetragene Note in einem archivierten Fach an', () =>
    withSeededDatabase(async (provided, pool) => {
      const blocked = await provided(
        Effect.flip(createNote({ ...fields, subjectId: 'latein', termId })),
      );
      expect(blocked._tag).toBe('FachNichtImSchuljahr');
      expect(await gradeCount(pool)).toBe('1');

      await provided(createNote({ ...fields, subjectId: 'biologie', termId }));
      expect(await gradeCount(pool)).toBe('2');
    }));
});
