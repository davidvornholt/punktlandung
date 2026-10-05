import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { deleteHalbjahr } from '#/features/halbjahre/services/halbjahr-deletion-service.ts';
import {
  createHalbjahr,
  listHalbjahre,
  updateHalbjahr,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import { createNote } from '#/features/noten/services/noten-service.ts';
import {
  behindLifecycleBarrier,
  countRows,
  firstHalbjahr,
  secondHalbjahr,
  waitForLifecycleLocks,
  withFach,
} from './halbjahr-fachstand-test-helpers.ts';

it('sperrt auch ein nach Beginn der Korrektur angelegtes Halbjahr vor der Notenprüfung', () =>
  withFach(async (provided, pool) => {
    await provided(createHalbjahr(firstHalbjahr));
    const [first] = await provided(listHalbjahre);
    if (first === undefined) {
      throw new Error('Angelegtes Halbjahr fehlt.');
    }
    const rowGate = await pool.connect();
    const gradeGate = await pool.connect();
    let correction: ReturnType<typeof provided> | undefined;
    let note: Promise<void> | undefined;
    try {
      await rowGate.query('BEGIN');
      await rowGate.query('SELECT id FROM term WHERE id = $1 FOR UPDATE', [
        first.id,
      ]);
      await gradeGate.query('BEGIN');
      await gradeGate.query('LOCK TABLE grade IN SHARE MODE');

      // Der SELECT-Snapshot der Korrektur enthält nur das erste Halbjahr.
      correction = provided(
        updateHalbjahr({
          ...firstHalbjahr,
          id: first.id,
          klassenstufe: 'J1',
        }).pipe(Effect.either),
      );
      await waitForLifecycleLocks(pool, 1);
      await provided(createHalbjahr(secondHalbjahr));
      const second = (await provided(listHalbjahre)).find(
        ({ half }) => half === 2,
      );
      if (second === undefined) {
        throw new Error('Zweites Halbjahr fehlt.');
      }
      note = provided(
        createNote({
          termId: second.id,
          subjectId: 'mathe',
          kind: 'test',
          wert: 1.25,
          gewicht: 1,
          notiz: null,
          datum: secondHalbjahr.startsOn,
        }),
      );
      await waitForLifecycleLocks(pool, 2);

      // Die Note hält jetzt die SHARE-Zeilensperre des neuen Halbjahrs.
      // Die Korrektur muss darauf warten, bevor sie dessen Noten zählt.
      await rowGate.query('COMMIT');
      await waitForLifecycleLocks(pool, 2);
      await gradeGate.query('COMMIT');
      await note;
      expect(await correction).toMatchObject({
        _tag: 'Left',
        left: { _tag: 'KlassenstufeCorrectionBlockedByNoten' },
      });
      expect(
        (await provided(listHalbjahre)).map(({ system }) => system),
      ).toEqual(['sechser', 'sechser']);
    } finally {
      await rowGate.query('ROLLBACK');
      await gradeGate.query('ROLLBACK');
      await Promise.allSettled([correction, note]);
      rowGate.release();
      gradeGate.release();
    }
  }));

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
