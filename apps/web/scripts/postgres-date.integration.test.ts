import { describe, expect, it } from 'bun:test';
import type { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';
import { currentHalbjahr } from '#/features/halbjahre/services/current-halbjahr.ts';
import {
  listHalbjahre,
  updateHalbjahr,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import { halbjahrFormValues } from '#/features/halbjahre/ui/halbjahr-form-model.ts';
import {
  createNote,
  updateNote,
} from '#/features/noten/services/noten-service.ts';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const note = {
  termId: 'term-alt',
  subjectId: 'mathe',
  kind: 'test' as const,
  wert: 2,
  gewicht: 1,
  notiz: null,
};

const halbjahr = {
  id: 'term-alt',
  klassenstufe: '10' as const,
  schoolYear: '2026/27',
  half: 1 as const,
  startsOn: '2026-09-14',
  endsOn: '2027-01-29',
};

describe('PostgreSQL-Kalenderdaten', () => {
  it('bewahrt DATE-Werte in Berlin durch Listen, Halbjahr- und Notenpfade exakt', () =>
    withPostgresTestDatabase(async (pool) => {
      Bun.env.TZ = 'Europe/Berlin';
      await Effect.runPromise(migrateDatabase(pool));
      await pool.query(`
        INSERT INTO subject (id, name, short_name)
        VALUES ('mathe', 'Mathematik', 'M');
        INSERT INTO term (id, klassenstufe, school_year, half, system, starts_on, ends_on)
        VALUES
          ('term-alt', '10', '2026/27', 1, 'sechser', '2026-09-14', '2027-01-29'),
          ('term-neu', '10', '2026/27', 2, 'sechser', '2027-02-01', '2027-07-28');
      `);
      const layer = postgresTestLayer(pool);
      const provided = <Value, Error>(
        effect: Effect.Effect<Value, Error, SqlClient | PgDrizzle>,
      ) => Effect.runPromise(effect.pipe(Effect.provide(layer)));

      const listed = await provided(listHalbjahre);
      expect(
        listed.map(({ id, startsOn, endsOn }) => ({ id, startsOn, endsOn })),
      ).toEqual([
        { id: 'term-neu', startsOn: '2027-02-01', endsOn: '2027-07-28' },
        { id: 'term-alt', startsOn: '2026-09-14', endsOn: '2027-01-29' },
      ]);
      expect(
        halbjahrFormValues(listed[1] ?? null, listed, '2026-09-14'),
      ).toMatchObject({
        startsOn: '2026-09-14',
        endsOn: '2027-01-29',
        dateRangeAdjusted: true,
      });
      expect(currentHalbjahr(listed, '2026-09-13')).toBeNull();
      expect(currentHalbjahr(listed, '2026-09-14')?.id).toBe('term-alt');
      expect(currentHalbjahr(listed, '2027-01-30')?.id).toBe('term-alt');
      expect(currentHalbjahr(listed, '2027-02-01')?.id).toBe('term-neu');
      expect(currentHalbjahr(listed, '2027-08-01')?.id).toBe('term-neu');

      await provided(createNote({ ...note, datum: halbjahr.startsOn }));
      await provided(createNote({ ...note, datum: halbjahr.endsOn }));
      const before = await provided(
        Effect.flip(createNote({ ...note, datum: '2026-09-13' })),
      );
      const after = await provided(
        Effect.flip(createNote({ ...note, datum: '2027-01-30' })),
      );
      expect(before._tag).toBe('NoteAusserhalbHalbjahr');
      expect(after._tag).toBe('NoteAusserhalbHalbjahr');

      await provided(updateHalbjahr(halbjahr));
      const shrink = await provided(
        Effect.flip(updateHalbjahr({ ...halbjahr, startsOn: '2026-09-15' })),
      );
      expect(shrink._tag).toBe('HalbjahrSchliesstNotenAus');

      const noten = await pool.query<{ readonly id: string }>(
        'SELECT id FROM grade ORDER BY taken_on LIMIT 1',
      );
      const noteId = noten.rows[0]?.id;
      expect(noteId).toBeString();
      if (noteId === undefined) {
        throw new Error('Testnote fehlt.');
      }
      const updateBefore = await provided(
        Effect.flip(updateNote({ ...note, id: noteId, datum: '2026-09-13' })),
      );
      const updateAfter = await provided(
        Effect.flip(updateNote({ ...note, id: noteId, datum: '2027-01-30' })),
      );
      expect(updateBefore._tag).toBe('NoteAusserhalbHalbjahr');
      expect(updateAfter._tag).toBe('NoteAusserhalbHalbjahr');
      await provided(
        updateNote({ ...note, id: noteId, datum: halbjahr.endsOn }),
      );
    }));
});
