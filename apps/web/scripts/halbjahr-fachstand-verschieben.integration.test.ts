import { describe, expect, it } from 'bun:test';
import {
  createHalbjahr,
  listHalbjahre,
  updateHalbjahr,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import {
  erstesHalbjahr,
  folgejahr,
  mitFach,
  vorjahr,
  zaehle,
  zweitesHalbjahr,
} from './halbjahr-fachstand-test-helpers.ts';

describe('Schuljahr-Fachstand nach dem Verschieben', () => {
  it('verwirft den Fachstand nach dem Verschieben des einzigen Halbjahrs', () =>
    mitFach(async (provided, pool) => {
      await provided(createHalbjahr(vorjahr));
      await provided(createHalbjahr(erstesHalbjahr));
      const vorhanden = (await provided(listHalbjahre)).find(
        ({ schoolYear }) => schoolYear === erstesHalbjahr.schoolYear,
      );
      if (vorhanden === undefined) {
        throw new Error('Zu verschiebendes Halbjahr fehlt.');
      }

      await provided(updateHalbjahr({ ...folgejahr, id: vorhanden.id }));
      expect(
        await zaehle(
          pool,
          'school_year_subject_set',
          erstesHalbjahr.schoolYear,
        ),
      ).toBe(0);
      await pool.query(
        `UPDATE school_year_subject
         SET name = 'Aktualisierte Mathematik'
         WHERE school_year = $1 AND subject_id = 'mathe'`,
        [vorjahr.schoolYear],
      );
      await provided(createHalbjahr(erstesHalbjahr));
      const fachstand = await pool.query<{ readonly name: string }>(
        `SELECT name FROM school_year_subject
         WHERE school_year = $1 AND subject_id = 'mathe'`,
        [erstesHalbjahr.schoolYear],
      );

      expect(fachstand.rows[0]?.name).toBe('Aktualisierte Mathematik');
    }));

  it('behält den Fachstand, wenn ein zweites Halbjahr zurückbleibt', () =>
    mitFach(async (provided, pool) => {
      await provided(createHalbjahr(erstesHalbjahr));
      await provided(createHalbjahr(zweitesHalbjahr));
      const zuVerschieben = (await provided(listHalbjahre)).find(
        ({ half }) => half === 2,
      );
      if (zuVerschieben === undefined) {
        throw new Error('Zu verschiebendes Halbjahr fehlt.');
      }

      await provided(
        updateHalbjahr({ ...folgejahr, half: 2, id: zuVerschieben.id }),
      );

      expect(await zaehle(pool, 'term', erstesHalbjahr.schoolYear)).toBe(1);
      expect(
        await zaehle(
          pool,
          'school_year_subject_set',
          erstesHalbjahr.schoolYear,
        ),
      ).toBe(1);
    }));
});
