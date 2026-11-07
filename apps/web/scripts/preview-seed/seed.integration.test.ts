import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import type { SqlClient } from 'effect/sql/SqlClient';
import type { Pool } from 'pg';
import { listFaecher } from '#/features/faecher/services/fach-service.ts';
import { listHalbjahre } from '#/features/halbjahre/services/halbjahr-service.ts';
import { loadLearningStatistics } from '#/features/lernen/services/learning-service.ts';
import {
  listNoten,
  loadLeistung,
} from '#/features/noten/services/noten-service.ts';
import { loadPreparationTemplates } from '#/features/noten/services/preparation-template-service.ts';
import { loadTrend } from '#/features/noten/services/trend-service.ts';
import { loadUpcoming } from '#/features/noten/services/upcoming-service.ts';
import { loadZeugnis } from '#/features/zeugnis/services/zeugnis-service.ts';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { migrateDatabase } from '#/shared/db/migrate.ts';
import type { PgDrizzle } from '#/shared/db/pg-drizzle.ts';
import { schoolYearForDate } from '#/shared/school/school-year.ts';
import {
  postgresTestLayer,
  withPostgresTestDatabase,
} from '../postgres-test-database.ts';
import { preparationTemplates } from './sample-calendar.ts';
import { seedPreview } from './seed.ts';

type Provided = <Value, Error>(
  effect: Effect.Effect<Value, Error, SqlClient | PgDrizzle>,
) => Promise<Value>;

const withMigratedDatabase = <Value>(
  use: (provided: Provided, pool: Pool) => Promise<Value>,
): Promise<Value> =>
  withPostgresTestDatabase(async (pool) => {
    await Effect.runPromise(migrateDatabase(pool));
    const layer = postgresTestLayer(pool);
    const provided: Provided = (effect) =>
      Effect.runPromise(effect.pipe(Effect.provide(layer)));
    return use(provided, pool);
  });

/** Zeilen je App- und Auth-Tabelle, um "unverändert" zu prüfen. */
const rowCounts = async (pool: Pool) => {
  const tables = await pool.query<{ name: string }>(
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'`,
  );
  const counts = await Promise.all(
    tables.rows.map(async ({ name }) => {
      const count = await pool.query<{ rows: number }>(
        `SELECT count(*)::int AS rows FROM "${name}"`,
      );
      return [name, count.rows[0]?.rows ?? 0] as const;
    }),
  );
  return Object.fromEntries(counts);
};

describe('Beispieldaten in einer leeren Datenbank', () => {
  it('füllt Halbjahre, Fächer, Notenverlauf und Zeugnisse', () =>
    withMigratedDatabase(async (provided) => {
      const today = berlinCalendarDate();
      const result = await provided(seedPreview(today));
      expect(result.status).toBe('seeded');

      const halbjahre = await provided(listHalbjahre);
      expect(halbjahre.length).toBeGreaterThanOrEqual(5);
      expect(new Set(halbjahre.map((halbjahr) => halbjahr.system))).toEqual(
        new Set(['sechser', 'punkte']),
      );
      expect(
        halbjahre.filter(
          (halbjahr) => halbjahr.startsOn <= today && today <= halbjahr.endsOn,
        ),
      ).toHaveLength(1);

      const faecher = await provided(listFaecher(schoolYearForDate(today)));
      expect(faecher.map((fach) => fach.shortName)).not.toContain('F');
      expect(faecher).toHaveLength(8);

      const trend = await provided(loadTrend);
      expect(
        new Set(trend.map((entry) => entry.datum.slice(0, 4))).size,
      ).toBeGreaterThanOrEqual(2);
      expect(trend.filter((entry) => entry.schnitt === null)).toEqual([]);

      const zeugnisse = await Promise.all(
        halbjahre
          .filter((halbjahr) => halbjahr.endsOn < today)
          .map((halbjahr) => provided(loadZeugnis(halbjahr.id))),
      );
      expect(zeugnisse.length).toBeGreaterThanOrEqual(4);
      expect(
        zeugnisse.filter((zeugnis) => zeugnis.gesamtschnitt === null),
      ).toEqual([]);
      expect(
        zeugnisse.flatMap((zeugnis) =>
          zeugnis.zeilen.filter(
            (zeile) => !zeile.archived && zeile.anzahlNoten === 0,
          ),
        ),
      ).toEqual([]);
    }));

  it('füllt die Übersicht mit Angekündigtem, Vorbereitung und Lerntagen', () =>
    withMigratedDatabase(async (provided) => {
      // Die Übersicht liest den heutigen Tag selbst, also seedet der Test auf heute.
      const today = berlinCalendarDate();
      await provided(seedPreview(today));

      const upcoming = await provided(loadUpcoming);
      expect(upcoming.overdue).toHaveLength(1);
      expect(upcoming.upcoming.length).toBeGreaterThanOrEqual(5);
      const klausur = upcoming.upcoming.find(
        (entry) => entry.kind === 'klausur' && entry.topics !== null,
      );
      expect(klausur?.topics).toEqual({ total: 4, checked: 2 });
      expect(klausur?.lernen.daysAgo).toBe(1);

      const detail = await provided(loadLeistung(klausur?.id ?? '', today));
      expect(detail.leistung.preparation).toContain('Kurvendiskussion');

      const statistics = await provided(loadLearningStatistics(today));
      expect(statistics.serie).toBe(7);

      const templates = await provided(loadPreparationTemplates);
      expect(templates.klausur).toBe(preparationTemplates[0]?.content ?? '');
    }));

  it.each([
    '2026-08-01',
    '2026-11-07',
    '2027-01-31',
    '2027-02-01',
    '2027-07-31',
  ])('legt zum %s alles an, was der Plan vorsieht', (today) =>
    withMigratedDatabase(async (provided) => {
      const result = await provided(seedPreview(today));
      if (result.status !== 'seeded') {
        throw new Error('Die leere Datenbank wurde nicht gefüllt.');
      }
      const halbjahre = await provided(listHalbjahre);
      expect(halbjahre).toHaveLength(result.counts.halbjahre);
      const noten = await Promise.all(
        halbjahre.map((halbjahr) => provided(listNoten(halbjahr.id))),
      );
      expect(noten.flat()).toHaveLength(
        result.counts.benotet + result.counts.ausstehend,
      );
    }),
  );
});

describe('Beispieldaten neben vorhandenen Daten', () => {
  it('ändert beim zweiten Lauf nichts und sagt, warum', () =>
    withMigratedDatabase(async (provided, pool) => {
      await provided(seedPreview('2026-11-07'));
      const before = await rowCounts(pool);

      const second = await provided(seedPreview('2026-11-07'));
      expect(second.status).toBe('skipped');
      expect(second.status === 'skipped' && second.tables).toContain('grade');
      expect(await rowCounts(pool)).toEqual(before);
    }));

  it('lässt eine Datenbank mit eigenen App-Daten unberührt', () =>
    withMigratedDatabase(async (provided, pool) => {
      await pool.query(
        `INSERT INTO preparation_template (kind, content) VALUES ('test', '- [ ] Eigene Vorlage')`,
      );
      const before = await rowCounts(pool);

      const result = await provided(seedPreview('2026-11-07'));
      expect(result).toEqual({
        status: 'skipped',
        tables: ['preparation_template'],
      });
      expect(await rowCounts(pool)).toEqual(before);
    }));

  it('zählt eine Anmeldung nicht als App-Daten', () =>
    withMigratedDatabase(async (provided, pool) => {
      await pool.query(
        `INSERT INTO "user" (id, name, email) VALUES ('david', 'David', 'david@example.invalid')`,
      );
      const result = await provided(seedPreview('2026-11-07'));
      expect(result.status).toBe('seeded');
      expect((await rowCounts(pool)).grade).toBeGreaterThan(0);
    }));
});
