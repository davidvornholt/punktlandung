import { describe, expect, it } from 'bun:test';
import type { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';
import type { Pool } from 'pg';

import {
  createNote,
  listNoten,
  loadLeistung,
  updateNote,
  updatePreparation,
} from '#/features/noten/services/noten-service.ts';
import {
  defaultPreparationTemplate,
  loadPreparationTemplates,
  savePreparationTemplate,
} from '#/features/noten/services/preparation-template-service.ts';
import { loadTrend } from '#/features/noten/services/trend-service.ts';
import { loadUpcoming } from '#/features/noten/services/upcoming-service.ts';
import { loadZeugnis } from '#/features/zeugnis/services/zeugnis-service.ts';
import { migrateDatabase } from '#/shared/db/migrate.ts';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const schoolYear = '2026/27';
const termId = 'hj-1';
/** Die eine benotete Klausur: Note 3, nach Notentendenz 8 Punkte. */
const benoteteNote = 3;
const benoteteNotenpunkte = 8;

const fields = {
  subjectId: 'mathe',
  kind: 'klausur',
  wert: null,
  gewicht: 1,
  datum: '2026-10-01',
  notiz: null,
  termId,
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
  await pool.query(
    `INSERT INTO subject (id, name, short_name, weighting, sort_order)
     VALUES ('mathe', 'Mathematik', 'M', $1, 0)`,
    [standardgewichtung],
  );
  await pool.query(
    `INSERT INTO school_year_subject
       (school_year, subject_id, name, short_name, weighting, sort_order, archived)
     VALUES ($1, 'mathe', 'Mathematik', 'M', $2, 0, false)`,
    [schoolYear, standardgewichtung],
  );
  await pool.query(
    'INSERT INTO school_year_subject_set (school_year) VALUES ($1)',
    [schoolYear],
  );
  await pool.query(
    `INSERT INTO grade (id, subject_id, term_id, kind, value, weight, taken_on)
     VALUES ('benotet', 'mathe', $1, 'klausur', '3.00', '1.00', '2026-09-20')`,
    [termId],
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

describe('Ausstehende Leistungen', () => {
  it('legt eine Klausur ohne Note an und hält sie aus jedem Schnitt heraus', () =>
    withSeededDatabase(async (provided) => {
      await provided(createNote(fields));

      const noten = await provided(listNoten(termId));
      expect(noten.map((note) => note.status)).toEqual(['planned', 'graded']);

      const trend = await provided(loadTrend);
      expect(trend).toHaveLength(1);
      expect(trend[0]?.schnitt).toBe(benoteteNotenpunkte);

      const zeugnis = await provided(loadZeugnis(termId));
      expect(zeugnis.zeilen[0]?.anzahlNoten).toBe(1);
      expect(zeugnis.zeilen[0]?.anzeige).toBe('3');

      const upcoming = await provided(loadUpcoming);
      expect(
        [...upcoming.upcoming, ...upcoming.overdue].map((entry) => entry.kind),
      ).toEqual(['klausur']);
      expect(
        upcoming.upcoming[0]?.fachschnitt ?? upcoming.overdue[0]?.fachschnitt,
      ).toBe(benoteteNote);
    }));

  it('verweigert eine ausstehende mündliche Note im Service und in der Datenbank', () =>
    withSeededDatabase(async (provided, pool) => {
      const blocked = await provided(
        Effect.flip(createNote({ ...fields, kind: 'muendlich' })),
      );
      expect(blocked._tag).toBe('NotenwertErforderlich');

      await expect(
        pool.query(
          `INSERT INTO grade (id, subject_id, term_id, kind, value, weight, taken_on)
           VALUES ('roh', 'mathe', $1, 'muendlich', NULL, '1.00', '2026-10-01')`,
          [termId],
        ),
      ).rejects.toThrow('grade_value_required_unless_planbar');
    }));

  it('trägt die Note später nach und nimmt sie auch wieder zurück', () =>
    withSeededDatabase(async (provided) => {
      await provided(createNote(fields));
      const planned = (await provided(listNoten(termId))).find(
        (note) => note.status === 'planned',
      );
      if (planned === undefined) {
        throw new Error('Die ausstehende Klausur fehlt.');
      }

      await provided(updateNote({ ...fields, id: planned.id, wert: 2 }));
      expect(
        (await provided(listNoten(termId))).map((note) => note.status),
      ).toEqual(['graded', 'graded']);
      expect((await provided(loadTrend)).length).toBe(2);

      await provided(updateNote({ ...fields, id: planned.id, wert: null }));
      expect((await provided(loadTrend)).length).toBe(1);
    }));
});

describe('Vorbereitung einer Leistung', () => {
  it('trägt eine Vorbereitung, deren Themen die Übersicht zählt und das Notenformular nicht anrührt', () =>
    withSeededDatabase(async (provided) => {
      await provided(createNote(fields));
      const planned = (await provided(listNoten(termId))).find(
        (note) => note.status === 'planned',
      );
      if (planned === undefined) {
        throw new Error('Die ausstehende Klausur fehlt.');
      }
      expect(planned.preparation).toBeNull();

      const markdown = '## Themen\n\n- [x] Gedichtanalyse\n- [ ] Erörterung\n';
      await provided(
        updatePreparation({ id: planned.id, preparation: markdown }),
      );
      const detail = await provided(loadLeistung(planned.id));
      expect(detail.leistung.preparation).toBe(markdown);
      expect(detail.halbjahr.label).toBe('10.1');

      const upcoming = await provided(loadUpcoming);
      const [entry] = [...upcoming.upcoming, ...upcoming.overdue];
      expect(entry?.topics).toEqual({ total: 2, checked: 1 });

      await provided(updateNote({ ...fields, id: planned.id, wert: 2 }));
      expect(
        (await provided(loadLeistung(planned.id))).leistung.preparation,
      ).toBe(markdown);

      const missing = await provided(
        Effect.flip(
          updatePreparation({ id: 'gibt-es-nicht', preparation: null }),
        ),
      );
      expect(missing._tag).toBe('NoteNichtGefunden');
    }));

  it('liefert für jede planbare Art eine Vorlage und merkt sich eine geänderte', () =>
    withSeededDatabase(async (provided) => {
      const defaults = await provided(loadPreparationTemplates);
      expect(defaults).toEqual({
        klausur: defaultPreparationTemplate,
        test: defaultPreparationTemplate,
        gfs: defaultPreparationTemplate,
      });

      await provided(
        savePreparationTemplate({ kind: 'gfs', content: '- [ ] Handout' }),
      );
      await provided(
        savePreparationTemplate({ kind: 'gfs', content: '- [ ] Vortrag üben' }),
      );
      const changed = await provided(loadPreparationTemplates);
      expect(changed.gfs).toBe('- [ ] Vortrag üben');
      expect(changed.klausur).toBe(defaultPreparationTemplate);
    }));
});
