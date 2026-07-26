import { describe, expect, it } from 'bun:test';
import { Effect, Either } from 'effect';
import {
  createHalbjahr,
  listHalbjahre,
  updateHalbjahr,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import {
  behindLifecycleBarrier,
  countRows,
  firstHalbjahr,
  followingSchoolYearHalbjahr,
  previousSchoolYearHalbjahr,
  secondHalbjahr,
  withFach,
} from './halbjahr-fachstand-test-helpers.ts';

describe('Halbjahr-Belegung unter Nebenläufigkeit', () => {
  it('serialisiert Anlegen und Verschieben in dieselbe Halbjahr-Belegung', () =>
    withFach(async (provided, pool) => {
      await provided(createHalbjahr(previousSchoolYearHalbjahr));
      const source = (await provided(listHalbjahre)).find(
        ({ schoolYear }) =>
          schoolYear === previousSchoolYearHalbjahr.schoolYear,
      );
      if (source === undefined) {
        throw new Error('Zu verschiebendes Halbjahr fehlt.');
      }
      const outcomes: Array<Either.Either<void, unknown>> = [];

      await behindLifecycleBarrier(pool, provided, firstHalbjahr.schoolYear, [
        () =>
          provided(
            updateHalbjahr({ ...firstHalbjahr, id: source.id }).pipe(
              Effect.either,
            ),
          ).then((outcome) => {
            outcomes.push(outcome);
          }),
        () =>
          provided(createHalbjahr(firstHalbjahr).pipe(Effect.either)).then(
            (outcome) => {
              outcomes.push(outcome);
            },
          ),
      ]);

      expect(outcomes.filter(Either.isLeft)).toHaveLength(1);
      expect(outcomes.filter(Either.isRight)).toHaveLength(1);
      const failure = outcomes.find(Either.isLeft);
      expect(
        typeof failure?.left === 'object' &&
          failure.left !== null &&
          '_tag' in failure.left
          ? failure.left._tag
          : null,
      ).toBe('HalbjahrBelegungDoppelt');
      expect(await countRows(pool, 'term', firstHalbjahr.schoolYear)).toBe(1);
      const invariants = await Promise.all(
        [previousSchoolYearHalbjahr.schoolYear, firstHalbjahr.schoolYear].map(
          async (schoolYear) => ({
            marker: await countRows(
              pool,
              'school_year_subject_set',
              schoolYear,
            ),
            terms: await countRows(pool, 'term', schoolYear),
          }),
        ),
      );
      for (const { marker, terms } of invariants) {
        expect(terms > 0).toBe(marker > 0);
      }
    }));
});

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
