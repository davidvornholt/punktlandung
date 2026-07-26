import { describe, expect, it } from 'bun:test';
import {
  createHalbjahr,
  deleteHalbjahr,
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
              provided(deleteHalbjahr(id)),
        ),
      );

      const terms = await countRows(pool, 'term', firstHalbjahr.schoolYear);
      const marker = await countRows(
        pool,
        'school_year_subject_set',
        firstHalbjahr.schoolYear,
      );
      expect(terms).toBe(0);
      expect(marker).toBe(0);
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
        () => provided(deleteHalbjahr(existing.id)),
        () => provided(createHalbjahr(secondHalbjahr)),
      ]);

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
});
