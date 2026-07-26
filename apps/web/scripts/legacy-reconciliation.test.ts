import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  applyInitialMigration,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const insertFach = (pool: Parameters<typeof applyInitialMigration>[0]) =>
  pool.query(
    `INSERT INTO subject (id, name, short_name)
     VALUES ('mathe', 'Mathematik', 'M')`,
  );

describe('Bestandsdaten vor Migrationen', () => {
  it('führt kompatible Halbjahre und Lerntage vor dem Constraint verlustfrei zusammen', () =>
    withPostgresTestDatabase(async (pool) => {
      await applyInitialMigration(pool);
      await insertFach(pool);
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

      const halbjahre = await pool.query('SELECT id FROM term');
      const noten = await pool.query(
        'SELECT id, term_id AS "halbjahrId" FROM grade ORDER BY id',
      );
      const studyDays = await pool.query(
        'SELECT id FROM study_day ORDER BY id',
      );
      expect(halbjahre.rows).toEqual([{ id: 'term-a' }]);
      expect(noten.rows).toEqual([
        { id: 'grade-a', halbjahrId: 'term-a' },
        { id: 'grade-b', halbjahrId: 'term-a' },
      ]);
      expect(studyDays.rows).toEqual([{ id: 'study-a' }, { id: 'study-c' }]);
      await expect(
        pool.query(`INSERT INTO term
          (id, klassenstufe, school_year, half, system, starts_on, ends_on)
          VALUES ('term-c', '10', '2026/27', 1, 'sechser', '2026-09-14', '2027-01-29')`),
      ).rejects.toMatchObject({ constraint: 'term_school_year_half_unique' });
      await expect(
        pool.query(`INSERT INTO study_day (id, day, subject_id)
          VALUES ('study-e', '2026-10-01', NULL)`),
      ).rejects.toMatchObject({ constraint: 'study_day_day_subject_unique' });
    }));

  it('führt Halbjahre mit abweichender Bezeichnung nicht zusammen', () =>
    withPostgresTestDatabase(async (pool) => {
      await applyInitialMigration(pool);
      await pool.query(`
        INSERT INTO term (id, label, school_year, half, system, starts_on, ends_on)
        VALUES
          ('term-a', '9.1', '2026/27', 1, 'sechser', '2026-09-14', '2027-01-29'),
          ('term-b', '10.1', '2026/27', 1, 'sechser', '2026-09-14', '2027-01-29');
      `);

      const exit = await Effect.runPromiseExit(migrateDatabase(pool));

      expect(exit._tag).toBe('Failure');
      expect(String(exit)).toContain('Halbjahr 2026/27/1');
      expect(
        (await pool.query('SELECT id FROM term ORDER BY id')).rows,
      ).toEqual([{ id: 'term-a' }, { id: 'term-b' }]);
    }));

  it('meldet alle nicht verlustfrei auflösbaren Gruppen und lässt sie unverändert', () =>
    withPostgresTestDatabase(async (pool) => {
      await applyInitialMigration(pool);
      await insertFach(pool);
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

describe('Klassenstufe aus der Bezeichnung', () => {
  it('leitet Klassenstufen ab und übersetzt die alte Kursstufen-Schreibweise', () =>
    withPostgresTestDatabase(async (pool) => {
      await applyInitialMigration(pool);
      await pool.query(`
        INSERT INTO term (id, label, school_year, half, system, starts_on, ends_on)
        VALUES
          ('term-a', '9.2', '2024/25', 2, 'sechser', '2025-02-01', '2025-07-31'),
          ('term-b', '10.1', '2025/26', 1, 'sechser', '2025-08-01', '2026-01-31'),
          ('term-c', 'K1.1', '2026/27', 1, 'punkte', '2026-08-01', '2027-01-31'),
          ('term-d', 'K2.2', '2027/28', 2, 'punkte', '2028-02-01', '2028-07-31');
      `);

      await Effect.runPromise(migrateDatabase(pool));

      const halbjahre = await pool.query(
        'SELECT id, klassenstufe FROM term ORDER BY id',
      );
      expect(halbjahre.rows).toEqual([
        { id: 'term-a', klassenstufe: '9' },
        { id: 'term-b', klassenstufe: '10' },
        { id: 'term-c', klassenstufe: 'J1' },
        { id: 'term-d', klassenstufe: 'J2' },
      ]);
    }));

  it('bricht ab und behält die Bezeichnung, wenn sich keine Klassenstufe ergibt', () =>
    withPostgresTestDatabase(async (pool) => {
      await applyInitialMigration(pool);
      await pool.query(`
        INSERT INTO term (id, label, school_year, half, system, starts_on, ends_on)
        VALUES ('term-a', '9b', '2024/25', 2, 'sechser', '2025-02-01', '2025-07-31');
      `);

      const exit = await Effect.runPromiseExit(migrateDatabase(pool));

      expect(exit._tag).toBe('Failure');
      expect(String(exit)).toContain('9b');
      expect((await pool.query('SELECT label FROM term')).rows).toEqual([
        { label: '9b' },
      ]);
    }));
});
