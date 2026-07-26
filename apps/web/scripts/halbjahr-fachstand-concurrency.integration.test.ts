import { describe, expect, it } from 'bun:test';
import {
  createHalbjahr,
  deleteHalbjahr,
  listHalbjahre,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import {
  erstesHalbjahr,
  hinterLifecycleBarriere,
  mitFach,
  zaehle,
  zweitesHalbjahr,
} from './halbjahr-fachstand-test-helpers.ts';

describe('Schuljahr-Fachstand-Lifecycle unter Nebenläufigkeit', () => {
  it('serialisiert zwei Löschungen desselben Schuljahrs', () =>
    mitFach(async (provided, pool) => {
      await provided(createHalbjahr(erstesHalbjahr));
      await provided(createHalbjahr(zweitesHalbjahr));
      const halbjahre = await provided(listHalbjahre);

      await hinterLifecycleBarriere(
        pool,
        provided,
        erstesHalbjahr.schoolYear,
        halbjahre.map(
          ({ id }) =>
            () =>
              provided(deleteHalbjahr(id)),
        ),
      );

      const terms = await zaehle(pool, 'term', erstesHalbjahr.schoolYear);
      const marker = await zaehle(
        pool,
        'school_year_subject_set',
        erstesHalbjahr.schoolYear,
      );
      expect(terms).toBe(0);
      expect(marker).toBe(0);
      expect(terms > 0).toBe(marker > 0);
    }));

  it('serialisiert Löschen und Anlegen im selben Schuljahr', () =>
    mitFach(async (provided, pool) => {
      await provided(createHalbjahr(erstesHalbjahr));
      const [vorhanden] = await provided(listHalbjahre);
      if (vorhanden === undefined) {
        throw new Error('Angelegtes Halbjahr fehlt.');
      }

      await hinterLifecycleBarriere(pool, provided, erstesHalbjahr.schoolYear, [
        () => provided(deleteHalbjahr(vorhanden.id)),
        () => provided(createHalbjahr(zweitesHalbjahr)),
      ]);

      const terms = await zaehle(pool, 'term', erstesHalbjahr.schoolYear);
      const marker = await zaehle(
        pool,
        'school_year_subject_set',
        erstesHalbjahr.schoolYear,
      );
      expect(terms).toBe(1);
      expect(marker).toBe(1);
      expect(terms > 0).toBe(marker > 0);
    }));
});
