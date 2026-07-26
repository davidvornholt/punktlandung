import { describe, expect, it } from 'bun:test';
import type { SqlClient } from '@effect/sql/SqlClient';
import type { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { Effect } from 'effect';

import { listFaecher } from '#/features/faecher/services/fach-service.ts';
import { listHalbjahre } from '#/features/halbjahre/services/halbjahr-service.ts';
import {
  listStudyDays,
  loadLearningStatistics,
} from '#/features/lernen/services/learning-service.ts';
import { listNoten } from '#/features/noten/services/noten-service.ts';
import { loadTrend } from '#/features/noten/services/trend-service.ts';
import { loadZeugnis } from '#/features/zeugnis/services/zeugnis-service.ts';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const keys = (value: unknown): ReadonlyArray<string> =>
  Object.keys(JSON.parse(JSON.stringify(value))).sort();

const required = <Value>(value: Value | undefined, name: string): Value => {
  if (value === undefined) {
    throw new Error(`${name} fehlt in der Produktionsantwort.`);
  }
  return value;
};

describe('server response wire contract', () => {
  it('keeps established keys through the exported production pipelines', () =>
    withPostgresTestDatabase(async (pool) => {
      await Effect.runPromise(migrateDatabase(pool));
      await pool.query(`
        INSERT INTO subject (
          id, name, short_name, weighting, sort_order
        )
        VALUES (
          'mathematik',
          'Mathematik',
          'M',
          '{"verhaeltnis":{"schriftlich":50,"muendlich":50},"arten":{"klausur":{"gewicht":2,"sammlung":"einzeln"},"gfs":{"gewicht":1,"sammlung":"einzeln"},"test":{"gewicht":1,"sammlung":"einzeln"},"muendlich":{"gewicht":1,"sammlung":"einzeln"},"sonstige":{"gewicht":1,"sammlung":"einzeln"}}}'::jsonb,
          0
        );

        INSERT INTO term (
          id, klassenstufe, school_year, half, system, starts_on, ends_on
        )
        VALUES
          ('halbjahr-1', '10', '2026/27', 1, 'sechser', '2026-08-01', '2027-01-31'),
          ('halbjahr-2', '10', '2026/27', 2, 'sechser', '2027-02-01', '2027-07-31');

        INSERT INTO grade (
          id, subject_id, term_id, kind, value, weight, taken_on, note
        )
        VALUES
          ('note-1', 'mathematik', 'halbjahr-1', 'klausur', 2, 1, '2026-10-01', NULL),
          ('note-2', 'mathematik', 'halbjahr-2', 'muendlich', 3, 1, '2027-03-01', 'Mitarbeit');

        INSERT INTO study_day (id, day, subject_id, minutes, note)
        VALUES ('lerntag-1', '2026-10-01', 'mathematik', 30, NULL);
      `);

      const layer = postgresTestLayer(pool);
      const provided = <Value, Error>(
        effect: Effect.Effect<Value, Error, SqlClient | PgDrizzle>,
      ) => Effect.runPromise(effect.pipe(Effect.provide(layer)));

      const fach = required(
        (await provided(listFaecher('2026/27')))[0],
        'Fach',
      );
      const halbjahr = required((await provided(listHalbjahre))[0], 'Halbjahr');
      const studyDay = required(
        (await provided(listStudyDays()))[0],
        'Lerntag',
      );
      const statistics = await provided(loadLearningStatistics('2026-10-02'));
      const note = required(
        (await provided(listNoten('halbjahr-1')))[0],
        'Note',
      );
      const trend = required((await provided(loadTrend))[0], 'Verlaufspunkt');
      const zeugnis = await provided(loadZeugnis('halbjahr-1'));

      expect(keys(fach)).toEqual([
        'gewichtung',
        'id',
        'name',
        'shortName',
        'sortOrder',
      ]);
      expect(keys(halbjahr)).toEqual([
        'endsOn',
        'half',
        'id',
        'klassenstufe',
        'notenCount',
        'schoolYear',
        'startsOn',
        'system',
      ]);
      expect(keys(studyDay)).toEqual([
        'createdAt',
        'day',
        'id',
        'minutes',
        'note',
        'subjectId',
      ]);
      expect(keys(statistics)).toEqual(['serie', 'tageDiesenMonat']);
      expect(keys(note)).toEqual([
        'datum',
        'fachId',
        'fachKuerzel',
        'fachName',
        'gewicht',
        'gewichtung',
        'id',
        'kind',
        'notiz',
        'wert',
      ]);
      expect(keys(note.gewichtung)).toEqual(['arten', 'verhaeltnis']);
      expect(keys(trend)).toEqual([
        'datum',
        'fachKuerzel',
        'fachName',
        'half',
        'klassenstufe',
        'leistungsart',
        'notensystem',
        'notenwert',
        'punkte',
        'schnitt',
      ]);
      expect(keys(zeugnis)).toEqual([
        'gesamtschnitt',
        'jahresvorschau',
        'label',
        'schoolYear',
        'system',
        'termId',
        'zeilen',
      ]);
      expect(keys(required(zeugnis.zeilen[0], 'Zeugniszeile'))).toEqual([
        'anzahlNoten',
        'anzeige',
        'fachId',
        'fachName',
      ]);
      expect(
        keys(required(zeugnis.jahresvorschau?.[0], 'Jahresvorschauzeile')),
      ).toEqual(['fachId', 'fachName', 'grenzfall', 'note']);
    }));
});
