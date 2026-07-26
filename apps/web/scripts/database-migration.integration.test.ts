import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import type { Pool } from 'pg';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  applyMigrationsThrough0002,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const columnDefaults = async (
  pool: Pool,
): Promise<ReadonlyArray<Record<string, string | null>>> => {
  const result = await pool.query<Record<string, string | null>>(`
    SELECT
      table_name AS "tableName",
      column_name AS "columnName",
      data_type AS "dataType",
      is_nullable AS "isNullable",
      column_default AS "columnDefault"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('subject', 'school_year_subject')
      AND column_name = 'weighting'
    ORDER BY table_name
  `);
  return result.rows;
};

const expectedWeightingColumns = [
  {
    tableName: 'school_year_subject',
    columnName: 'weighting',
    dataType: 'jsonb',
    isNullable: 'NO',
    columnDefault: null,
  },
  {
    tableName: 'subject',
    columnName: 'weighting',
    dataType: 'jsonb',
    isNullable: 'NO',
    columnDefault: null,
  },
];

const seedLegacySubjectAndTerm = async (pool: Pool): Promise<void> => {
  await pool.query(`
    INSERT INTO subject (
      id, name, short_name, written_share, klausur_weight, test_weight,
      muendlich_weight, gfs_weight, sonstige_weight
    ) VALUES ('mathe', 'Mathematik', 'M', 60, 2, 3, 4, 5, 6);

    INSERT INTO school_year_subject (
      school_year, subject_id, name, short_name, written_share, klausur_weight,
      test_weight, muendlich_weight, gfs_weight, sonstige_weight
    ) VALUES ('2026/27', 'mathe', 'Mathematik', 'M', 60, 2, 3, 4, 5, 6);

    INSERT INTO term (
      id, klassenstufe, school_year, half, system, starts_on, ends_on
    ) VALUES (
      'halbjahr', '10', '2026/27', 1, 'sechser', '2026-09-01', '2027-01-31'
    );
  `);
};

describe('Datenbankmigrationen', () => {
  it('deployt eine frische Datenbank ohne Gewichtungs-Defaults', () =>
    withPostgresTestDatabase(async (pool) => {
      await Effect.runPromise(migrateDatabase(pool));

      expect(await columnDefaults(pool)).toEqual(expectedWeightingColumns);
    }));

  it('migriert kompatible Altbereiche und Gewichtungen ab 0002 verlustfrei', () =>
    withPostgresTestDatabase(async (pool) => {
      await applyMigrationsThrough0002(pool);
      await seedLegacySubjectAndTerm(pool);
      await pool.query(`
        INSERT INTO grade (
          id, subject_id, term_id, kind, area, value, taken_on
        ) VALUES
          ('gfs', 'mathe', 'halbjahr', 'gfs', 'schriftlich', 1, '2026-09-01'),
          ('klausur', 'mathe', 'halbjahr', 'klausur', 'schriftlich', 1, '2026-09-02'),
          ('muendlich', 'mathe', 'halbjahr', 'muendlich', 'muendlich', 1, '2026-09-03'),
          ('sonstige', 'mathe', 'halbjahr', 'sonstige', 'muendlich', 1, '2026-09-04'),
          ('test', 'mathe', 'halbjahr', 'test', 'schriftlich', 1, '2026-09-05');
      `);

      await Effect.runPromise(migrateDatabase(pool));

      expect(await columnDefaults(pool)).toEqual(expectedWeightingColumns);
      const weighting = await pool.query<{
        readonly weighting: {
          readonly verhaeltnis: {
            readonly schriftlich: number;
            readonly muendlich: number;
          };
          readonly arten: Record<
            string,
            { readonly gewicht: number; readonly sammlung: string }
          >;
        };
      }>('SELECT weighting FROM subject WHERE id = $1', ['mathe']);
      expect(weighting.rows[0]?.weighting).toEqual({
        verhaeltnis: { schriftlich: 60, muendlich: 40 },
        arten: {
          klausur: { gewicht: 2, sammlung: 'einzeln' },
          test: { gewicht: 3, sammlung: 'einzeln' },
          muendlich: { gewicht: 4, sammlung: 'einzeln' },
          gfs: { gewicht: 5, sammlung: 'einzeln' },
          sonstige: { gewicht: 6, sammlung: 'einzeln' },
        },
      });
      const gradeArea = await pool.query<{ readonly exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'grade'
            AND column_name = 'area'
        ) AS "exists"
      `);
      expect(gradeArea.rows[0]?.exists).toBeFalse();
    }));

  it('listet abweichende Altbereiche aller Leistungsarten und ändert nichts', () =>
    withPostgresTestDatabase(async (pool) => {
      await applyMigrationsThrough0002(pool);
      await seedLegacySubjectAndTerm(pool);
      await pool.query(`
        INSERT INTO grade (
          id, subject_id, term_id, kind, area, value, taken_on
        ) VALUES
          ('gfs-richtig', 'mathe', 'halbjahr', 'gfs', 'schriftlich', 1, '2026-09-01'),
          ('gfs-falsch', 'mathe', 'halbjahr', 'gfs', 'muendlich', 1, '2026-09-02'),
          ('klausur-richtig', 'mathe', 'halbjahr', 'klausur', 'schriftlich', 1, '2026-09-03'),
          ('klausur-falsch', 'mathe', 'halbjahr', 'klausur', 'muendlich', 1, '2026-09-04'),
          ('muendlich-richtig', 'mathe', 'halbjahr', 'muendlich', 'muendlich', 1, '2026-09-05'),
          ('muendlich-falsch', 'mathe', 'halbjahr', 'muendlich', 'schriftlich', 1, '2026-09-06'),
          ('sonstige-richtig', 'mathe', 'halbjahr', 'sonstige', 'muendlich', 1, '2026-09-07'),
          ('sonstige-falsch', 'mathe', 'halbjahr', 'sonstige', 'schriftlich', 1, '2026-09-08'),
          ('test-richtig', 'mathe', 'halbjahr', 'test', 'schriftlich', 1, '2026-09-09'),
          ('test-falsch', 'mathe', 'halbjahr', 'test', 'muendlich', 1, '2026-09-10');
      `);

      const result = await Effect.runPromise(
        Effect.either(migrateDatabase(pool)),
      );
      expect(result._tag).toBe('Left');
      if (result._tag === 'Right') {
        throw new Error('Die Migration hätte abgebrochen werden müssen.');
      }
      const migrationCause = result.left.cause;
      if (!(migrationCause instanceof Error)) {
        throw new Error('Die Migration lieferte keinen Error als Ursache.');
      }
      const queryCause = migrationCause.cause;
      if (!(queryCause instanceof Error)) {
        throw new Error('Der Migrationsfehler enthält keine Query-Ursache.');
      }
      const { message } = queryCause;
      for (const id of [
        'gfs-falsch',
        'klausur-falsch',
        'muendlich-falsch',
        'sonstige-falsch',
        'test-falsch',
      ]) {
        expect(message).toContain(id);
      }
      for (const id of [
        'gfs-richtig',
        'klausur-richtig',
        'muendlich-richtig',
        'sonstige-richtig',
        'test-richtig',
      ]) {
        expect(message).not.toContain(id);
      }
      expect(await columnDefaults(pool)).toEqual([]);
      const gradeArea = await pool.query<{
        readonly area: string;
        readonly count: string;
      }>(`
        SELECT area::text AS area, count(*)::text AS count
        FROM grade
        GROUP BY area
        ORDER BY area
      `);
      expect(gradeArea.rows).toEqual([
        { area: 'muendlich', count: '5' },
        { area: 'schriftlich', count: '5' },
      ]);
    }));
});
