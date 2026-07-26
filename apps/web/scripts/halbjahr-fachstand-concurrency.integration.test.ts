import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { deleteHalbjahr } from '#/features/halbjahre/services/halbjahr-deletion-service.ts';
import {
  createHalbjahr,
  listHalbjahre,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import {
  behindLifecycleBarrier,
  countRows,
  firstHalbjahr,
  secondHalbjahr,
  withFach,
} from './halbjahr-fachstand-test-helpers.ts';

describe('Schuljahr-Fachstand-Lifecycle unter Nebenläufigkeit', () => {
  it('serialisiert zwei Löschungen desselben Schuljahrs', () =>
    withFach(async (provided, pool) => {
      await provided(createHalbjahr(firstHalbjahr));
      await provided(createHalbjahr(secondHalbjahr));
      const halbjahre = await provided(listHalbjahre);

      await behindLifecycleBarrier(
        pool,
        provided,
        firstHalbjahr.schoolYear,
        halbjahre.map(
          ({ id }) =>
            () =>
              provided(
                deleteHalbjahr({
                  expectedFinalInSchoolYear: false,
                  id,
                }).pipe(Effect.either),
              ).then(() => undefined),
        ),
      );

      const terms = await countRows(pool, 'term', firstHalbjahr.schoolYear);
      const marker = await countRows(
        pool,
        'school_year_subject_set',
        firstHalbjahr.schoolYear,
      );
      expect(terms).toBe(1);
      expect(marker).toBe(1);
      expect(terms > 0).toBe(marker > 0);
    }));

  it('serialisiert Löschen und Anlegen im selben Schuljahr', () =>
    withFach(async (provided, pool) => {
      await provided(createHalbjahr(firstHalbjahr));
      const [existing] = await provided(listHalbjahre);
      if (existing === undefined) {
        throw new Error('Angelegtes Halbjahr fehlt.');
      }

      await behindLifecycleBarrier(pool, provided, firstHalbjahr.schoolYear, [
        () =>
          provided(
            deleteHalbjahr({
              expectedFinalInSchoolYear: true,
              id: existing.id,
            }).pipe(Effect.either),
          ).then(() => undefined),
        () => provided(createHalbjahr(secondHalbjahr)),
      ]);

      const terms = await countRows(pool, 'term', firstHalbjahr.schoolYear);
      const marker = await countRows(
        pool,
        'school_year_subject_set',
        firstHalbjahr.schoolYear,
      );
      expect([1, 2]).toContain(terms);
      expect(marker).toBe(1);
      expect(terms > 0).toBe(marker > 0);
    }));
});
