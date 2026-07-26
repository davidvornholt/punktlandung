import { describe, expect, it } from 'bun:test';
import {
  createHalbjahr,
  listHalbjahre,
  updateHalbjahr,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import {
  countRows,
  firstHalbjahr,
  followingSchoolYearHalbjahr,
  previousSchoolYearHalbjahr,
  secondHalbjahr,
  withFach,
} from './halbjahr-fachstand-test-helpers.ts';

describe('Schuljahr-Fachstand nach dem Verschieben', () => {
  it('verwirft den Fachstand nach dem Verschieben des einzigen Halbjahrs', () =>
    withFach(async (provided, pool) => {
      await provided(createHalbjahr(previousSchoolYearHalbjahr));
      await provided(createHalbjahr(firstHalbjahr));
      const existing = (await provided(listHalbjahre)).find(
        ({ schoolYear }) => schoolYear === firstHalbjahr.schoolYear,
      );
      if (existing === undefined) {
        throw new Error('Zu verschiebendes Halbjahr fehlt.');
      }

      await provided(
        updateHalbjahr({
          ...followingSchoolYearHalbjahr,
          id: existing.id,
        }),
      );
      expect(
        await countRows(
          pool,
          'school_year_subject_set',
          firstHalbjahr.schoolYear,
        ),
      ).toBe(0);
      await pool.query(
        `UPDATE school_year_subject
         SET name = 'Aktualisierte Mathematik'
         WHERE school_year = $1 AND subject_id = 'mathe'`,
        [previousSchoolYearHalbjahr.schoolYear],
      );
      await provided(createHalbjahr(firstHalbjahr));
      const fachstand = await pool.query<{ readonly name: string }>(
        `SELECT name FROM school_year_subject
         WHERE school_year = $1 AND subject_id = 'mathe'`,
        [firstHalbjahr.schoolYear],
      );

      expect(fachstand.rows[0]?.name).toBe('Aktualisierte Mathematik');
    }));

  it('behält den Fachstand, wenn ein zweites Halbjahr zurückbleibt', () =>
    withFach(async (provided, pool) => {
      await provided(createHalbjahr(firstHalbjahr));
      await provided(createHalbjahr(secondHalbjahr));
      const toMove = (await provided(listHalbjahre)).find(
        ({ half }) => half === 2,
      );
      if (toMove === undefined) {
        throw new Error('Zu verschiebendes Halbjahr fehlt.');
      }

      await provided(
        updateHalbjahr({
          ...followingSchoolYearHalbjahr,
          half: 2,
          id: toMove.id,
        }),
      );

      expect(await countRows(pool, 'term', firstHalbjahr.schoolYear)).toBe(1);
      expect(
        await countRows(
          pool,
          'school_year_subject_set',
          firstHalbjahr.schoolYear,
        ),
      ).toBe(1);
    }));
});
