import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  applyInitialMigration,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const insertSubject = (pool: Parameters<typeof applyInitialMigration>[0]) =>
  pool.query(
    `INSERT INTO subject (id, name, short_name)
     VALUES ('mathe', 'Mathematik', 'M')`,
  );

describe('Bestandsdaten vor Migrationen', () => {
  it('führt kompatible Halbjahre und Lerntage vor dem Constraint verlustfrei zusammen', () =>
    withPostgresTestDatabase(async (pool) => {
      await applyInitialMigration(pool);
      await insertSubject(pool);
      await pool.query(`
        INSERT INTO term (id, label, school_year, half, system, starts_on, ends_on)
        VALUES
          ('term-a', '10.1', '2026/27', 1, 'sechser', '2026-09-14', '2027-01-29'),
          ('term-b', '10.1', '2026/27', 1, 'sechser', '2026-09-14', '2027-01-29');
        INSERT INTO grade (id, subject_id, term_id, kind, area, value, taken_on)
        VALUES
          ('grade-a', 'mathe', 'term-a', 'test', 'schriftlich', 2, '2026-10-01'),
          ('grade-b', 'mathe', 'term-b', 'test', 'schriftlich', 3, '2026-11-01');
        INSERT INTO study_day (id, day, subject_id, minutes, note)
        VALUES
          ('study-a', '2026-10-01', NULL, 30, 'Wiederholung'),
          ('study-b', '2026-10-01', NULL, 30, 'Wiederholung'),
          ('study-c', '2026-10-02', 'mathe', 45, NULL),
          ('study-d', '2026-10-02', 'mathe', 45, NULL);
      `);

      await Effect.runPromise(migrateDatabase(pool));

      const terms = await pool.query('SELECT id FROM term');
      const grades = await pool.query(
        'SELECT id, term_id AS "termId" FROM grade ORDER BY id',
      );
      const studyDays = await pool.query(
        'SELECT id FROM study_day ORDER BY id',
      );
      expect(terms.rows).toEqual([{ id: 'term-a' }]);
      expect(grades.rows).toEqual([
        { id: 'grade-a', termId: 'term-a' },
        { id: 'grade-b', termId: 'term-a' },
      ]);
      expect(studyDays.rows).toEqual([{ id: 'study-a' }, { id: 'study-c' }]);
      await expect(
        pool.query(`INSERT INTO term
          (id, label, school_year, half, system, starts_on, ends_on)
          VALUES ('term-c', '10.1', '2026/27', 1, 'sechser', '2026-09-14', '2027-01-29')`),
      ).rejects.toMatchObject({ constraint: 'term_school_year_half_unique' });
      await expect(
        pool.query(`INSERT INTO study_day (id, day, subject_id)
          VALUES ('study-e', '2026-10-01', NULL)`),
      ).rejects.toMatchObject({ constraint: 'study_day_day_subject_unique' });
    }));

  it('meldet alle nicht verlustfrei auflösbaren Gruppen und lässt sie unverändert', () =>
    withPostgresTestDatabase(async (pool) => {
      await applyInitialMigration(pool);
      await insertSubject(pool);
      await pool.query(`
        INSERT INTO term (id, label, school_year, half, system, starts_on, ends_on)
        VALUES
          ('term-a', '10.1', '2026/27', 1, 'sechser', '2026-09-14', '2027-01-29'),
          ('term-b', 'K1.1', '2026/27', 1, 'punkte', '2026-09-15', '2027-01-30');
        INSERT INTO study_day (id, day, subject_id, minutes, note)
        VALUES
          ('study-a', '2026-10-01', NULL, 30, NULL),
          ('study-b', '2026-10-01', NULL, 60, NULL),
          ('study-c', '2026-10-02', 'mathe', 45, 'A'),
          ('study-d', '2026-10-02', 'mathe', 45, 'B');
      `);

      const exit = await Effect.runPromiseExit(migrateDatabase(pool));
      const rendered = String(exit);

      expect(exit._tag).toBe('Failure');
      expect(rendered).toContain('Halbjahr 2026/27/1');
      expect(rendered).toContain('Lerntag 2026-10-01/ohne Fach');
      expect(rendered).toContain('Lerntag 2026-10-02/mathe');
      expect(
        (await pool.query('SELECT count(*)::int AS count FROM term')).rows,
      ).toEqual([{ count: 2 }]);
      expect(
        (
          await pool.query(
            `SELECT count(*)::int AS count FROM pg_constraint
              WHERE conname IN ('term_school_year_half_unique', 'study_day_day_subject_unique')`,
          )
        ).rows,
      ).toEqual([{ count: 0 }]);
    }));
});
