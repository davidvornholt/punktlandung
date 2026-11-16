import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import type { Pool } from 'pg';
import {
  createNote,
  createSubmittedNote,
  deleteNote,
  listNoten,
} from '#/features/noten/services/noten-service.ts';
import { migrateDatabase } from '#/shared/db/migrate.ts';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const termId = 'hj-1';

const earlier = {
  id: 'abgabe-0',
  termId,
  subjectId: 'mathe',
  kind: 'klausur',
  wert: 1,
  gewicht: 1,
  datum: '2026-10-01',
  notiz: 'Frühere Note',
} as const;

const submitted = {
  ...earlier,
  id: 'abgabe-1',
  wert: 5,
  datum: '2026-10-08',
  notiz: 'Einmal eingegeben',
} as const;

const withSeededDatabase = <Value>(
  use: (
    provided: <A, E>(
      effect: Effect.Effect<
        A,
        E,
        Effect.Services<ReturnType<typeof createNote>>
      >,
    ) => Promise<A>,
    pool: Pool,
  ) => Promise<Value>,
): Promise<Value> =>
  withPostgresTestDatabase(async (pool) => {
    await Effect.runPromise(migrateDatabase(pool));
    await pool.query(
      `INSERT INTO term (id, klassenstufe, school_year, half, system, starts_on, ends_on)
       VALUES ($1, '10', '2026/27', 1, 'sechser', '2026-08-01', '2027-01-31')`,
      [termId],
    );
    await pool.query(
      `INSERT INTO subject (id, name, short_name, weighting, sort_order)
       VALUES ('mathe', 'Mathematik', 'M', $1, 0)`,
      [standardgewichtung],
    );
    await pool.query(
      `INSERT INTO school_year_subject
         (school_year, subject_id, name, short_name, weighting, sort_order, archived)
       VALUES ('2026/27', 'mathe', 'Mathematik', 'M', $1, 0, false)`,
      [standardgewichtung],
    );
    await pool.query(
      "INSERT INTO school_year_subject_set (school_year) VALUES ('2026/27')",
    );
    const layer = postgresTestLayer(pool);
    return use(
      (effect) => Effect.runPromise(effect.pipe(Effect.provide(layer))),
      pool,
    );
  });

const werte = (
  noten: ReadonlyArray<{ readonly status: string; readonly wert?: number }>,
) => noten.map((note) => note.wert).sort((a, b) => (a ?? 0) - (b ?? 0));

describe('Eine wiederholte Abgabe einer Note', () => {
  it('speichert die Note nur einmal, auch wenn die Antwort verloren ging', () =>
    withSeededDatabase(async (provided) => {
      await provided(createNote(earlier));
      await provided(createNote(submitted));
      // Die Antwort kam nie an; das Formular schickt dieselbe Abgabe erneut.
      await provided(createNote(submitted));

      expect(werte(await provided(listNoten(termId)))).toEqual([1, 5]);
    }));

  it('speichert dieselbe Note aus einer neuen Abgabe als weitere Note', () =>
    withSeededDatabase(async (provided) => {
      await provided(createNote(earlier));
      await provided(createNote(submitted));
      await provided(createNote({ ...submitted, id: 'abgabe-2' }));

      expect(werte(await provided(listNoten(termId)))).toEqual([1, 5, 5]);
    }));

  it('speichert die Note einmal, wenn beide Abgaben gleichzeitig ankommen', () =>
    withSeededDatabase(async (provided) => {
      await Promise.all([
        provided(createNote(submitted)),
        provided(createNote(submitted)),
      ]);

      expect(werte(await provided(listNoten(termId)))).toEqual([5]);
    }));

  it('legt eine gelöschte Note bei erneutem Senden nicht wieder an', () =>
    withSeededDatabase(async (provided) => {
      await provided(createNote(earlier));
      await provided(createNote(submitted));
      // Ein anderer Tab löscht die gespeicherte Note, bevor die Abgabe wiederholt wird.
      await provided(deleteNote(submitted.id));
      await provided(createNote(submitted));

      expect(werte(await provided(listNoten(termId)))).toEqual([1]);
    }));

  it('bestätigt eine gespeicherte Abgabe auch, wenn ihr Fach danach archiviert wurde', () =>
    withSeededDatabase(async (provided, pool) => {
      await provided(createNote(submitted));
      await pool.query(
        "UPDATE school_year_subject SET archived = true WHERE subject_id = 'mathe'",
      );
      // Ein neuer Eintrag im archivierten Fach bleibt gesperrt.
      const blocked = await provided(
        Effect.flip(createNote({ ...submitted, id: 'abgabe-neu' })),
      );
      expect(blocked._tag).toBe('FachNichtImSchuljahr');

      await provided(createNote(submitted));

      expect(werte(await provided(listNoten(termId)))).toEqual([5]);
    }));

  it('vermerkt eine abgelehnte Abgabe nicht, damit sie nach der Korrektur ankommt', () =>
    withSeededDatabase(async (provided, pool) => {
      await pool.query(
        "UPDATE school_year_subject SET archived = true WHERE subject_id = 'mathe'",
      );
      const blocked = await provided(Effect.flip(createNote(submitted)));
      expect(blocked._tag).toBe('FachNichtImSchuljahr');

      await pool.query(
        "UPDATE school_year_subject SET archived = false WHERE subject_id = 'mathe'",
      );
      await provided(createNote(submitted));

      expect(werte(await provided(listNoten(termId)))).toEqual([5]);
    }));

  it('verlangt von einer Abgabe ohne ID, die Seite neu zu laden', () =>
    withSeededDatabase(async (provided, pool) => {
      // So sendet ein vor dem Update geladener Tab: ohne `id`.
      const { id: _fehlt, ...staleTab } = submitted;
      const refused = await provided(
        Effect.flip(createSubmittedNote(staleTab)),
      );

      expect(refused._tag).toBe('AbgabeOhneId');
      expect(refused.message).toContain('Lade die Seite neu');
      const stored = await pool.query('SELECT 1 FROM grade');
      expect(stored.rowCount).toBe(0);
    }));
});
