import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import type { DatabaseError } from 'pg';
import {
  createHalbjahr,
  listHalbjahre,
  updateHalbjahr,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import { createNote } from '#/features/noten/services/noten-service.ts';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  behindLifecycleBarrier,
  type EffectRunner,
  firstHalbjahr,
  followingSchoolYearHalbjahr,
  secondHalbjahr,
  withFach,
} from './halbjahr-fachstand-test-helpers.ts';
import { withPostgresTestDatabase } from './postgres-test-database.ts';

/** Das Halbjahr eines Schuljahrs; scheitert, wenn es fehlt. */
const halbjahrIn = async (
  provided: EffectRunner,
  schoolYear: string,
  half: 1 | 2,
) => {
  const halbjahr = (await provided(listHalbjahre)).find(
    (entry) => entry.schoolYear === schoolYear && entry.half === half,
  );
  if (halbjahr === undefined) {
    throw new Error(`Das ${half}. Halbjahr ${schoolYear} fehlt.`);
  }
  return halbjahr;
};

/** Schuljahr, Halbjahr, Klassenstufe und Notensystem aller Halbjahre. */
const klassenstufen = async (provided: EffectRunner) =>
  (await provided(listHalbjahre))
    .map(
      (halbjahr) =>
        `${halbjahr.schoolYear} ${halbjahr.half} ${halbjahr.klassenstufe} ${halbjahr.system}`,
    )
    .sort();

describe('Klassenstufe eines Schuljahrs korrigieren', () => {
  it('lehnt beim Verschieben in ein Schuljahr eine abweichende Klassenstufe ab und lässt das Halbjahr unverändert', () =>
    withFach(async (provided) => {
      await provided(createHalbjahr(firstHalbjahr));
      await provided(createHalbjahr(followingSchoolYearHalbjahr));
      const following = await halbjahrIn(
        provided,
        followingSchoolYearHalbjahr.schoolYear,
        1,
      );

      const error = await provided(
        Effect.flip(
          updateHalbjahr({
            ...secondHalbjahr,
            id: following.id,
            klassenstufe: '9',
          }),
        ),
      );

      expect(error._tag).toBe('KlassenstufeDiffersInSchoolYear');
      expect(await klassenstufen(provided)).toEqual([
        '2026/27 1 10 sechser',
        '2027/28 1 10 sechser',
      ]);
    }));

  it('korrigiert beim Ändern die Klassenstufe beider Halbjahre des Schuljahrs', () =>
    withFach(async (provided) => {
      await provided(createHalbjahr(firstHalbjahr));
      await provided(createHalbjahr(secondHalbjahr));
      await provided(createHalbjahr(followingSchoolYearHalbjahr));
      const second = await halbjahrIn(provided, secondHalbjahr.schoolYear, 2);

      await provided(
        updateHalbjahr({ ...secondHalbjahr, id: second.id, klassenstufe: '9' }),
      );
      expect(await klassenstufen(provided)).toEqual([
        '2026/27 1 9 sechser',
        '2026/27 2 9 sechser',
        '2027/28 1 10 sechser',
      ]);

      const first = await halbjahrIn(provided, firstHalbjahr.schoolYear, 1);
      await provided(
        updateHalbjahr({ ...firstHalbjahr, id: first.id, klassenstufe: 'J1' }),
      );
      expect(await klassenstufen(provided)).toEqual([
        '2026/27 1 J1 punkte',
        '2026/27 2 J1 punkte',
        '2027/28 1 10 sechser',
      ]);
    }));
});

describe('Klassenstufe korrigieren neben Noten und gleichzeitigen Änderungen', () => {
  it('lehnt eine Korrektur ab, die das Notensystem eines Halbjahrs mit Noten wechseln würde', () =>
    withFach(async (provided) => {
      await provided(createHalbjahr(firstHalbjahr));
      await provided(createHalbjahr(secondHalbjahr));
      const first = await halbjahrIn(provided, firstHalbjahr.schoolYear, 1);
      const second = await halbjahrIn(provided, secondHalbjahr.schoolYear, 2);
      await provided(
        createNote({
          termId: first.id,
          subjectId: 'mathe',
          kind: 'test',
          wert: 2,
          gewicht: 1,
          notiz: null,
          datum: firstHalbjahr.startsOn,
        }),
      );

      const error = await provided(
        Effect.flip(
          updateHalbjahr({
            ...secondHalbjahr,
            id: second.id,
            klassenstufe: 'J1',
          }),
        ),
      );

      expect(error._tag).toBe('KlassenstufeCorrectionBlockedByNoten');
      expect(error.message).toBe(
        'Im 1. Halbjahr 2026/27 sind schon Noten eingetragen. Die Klassenstufe gilt für beide Halbjahre; mit Kursstufe J1 würde sich auch dort das Notensystem ändern. Lösche zuerst diese Noten oder behalte die Klassenstufe.',
      );
      expect(await klassenstufen(provided)).toEqual([
        '2026/27 1 10 sechser',
        '2026/27 2 10 sechser',
      ]);

      await provided(
        updateHalbjahr({ ...secondHalbjahr, id: second.id, klassenstufe: '9' }),
      );
      expect(await klassenstufen(provided)).toEqual([
        '2026/27 1 9 sechser',
        '2026/27 2 9 sechser',
      ]);
    }));

  it('korrigiert die Klassenstufe auch neben einer gleichzeitigen Änderung des anderen Halbjahrs', () =>
    withFach(async (provided, pool) => {
      await provided(createHalbjahr(firstHalbjahr));
      await provided(createHalbjahr(secondHalbjahr));
      const first = await halbjahrIn(provided, firstHalbjahr.schoolYear, 1);
      const second = await halbjahrIn(provided, secondHalbjahr.schoolYear, 2);

      // Unter der alten Sperrreihenfolge hielte jede Änderung ihr eigenes
      // Halbjahr und wartete auf den Schuljahr-Lock; die Korrektur bräuchte
      // danach auch die Zeile der anderen und Postgres bräche eine ab.
      await behindLifecycleBarrier(pool, provided, firstHalbjahr.schoolYear, [
        () =>
          provided(
            updateHalbjahr({
              ...firstHalbjahr,
              id: first.id,
              klassenstufe: '9',
            }),
          ),
        () =>
          provided(
            updateHalbjahr({
              ...secondHalbjahr,
              id: second.id,
              klassenstufe: '9',
              endsOn: '2027-07-29',
            }),
          ),
      ]);

      expect(await klassenstufen(provided)).toEqual([
        '2026/27 1 9 sechser',
        '2026/27 2 9 sechser',
      ]);
      const changed = await halbjahrIn(provided, secondHalbjahr.schoolYear, 2);
      expect(changed.endsOn).toBe('2027-07-29');
    }));
});

describe('Klassenstufe eines Schuljahrs in der Datenbank korrigieren', () => {
  it('lässt eine Anweisung beide Halbjahre eines Schuljahrs zugleich korrigieren', () =>
    withPostgresTestDatabase(async (pool) => {
      await Effect.runPromise(migrateDatabase(pool));
      await pool.query(
        `INSERT INTO term (
           id, klassenstufe, school_year, half, system, starts_on, ends_on
         ) VALUES
           ('erstes', '10', '2026/27', 1, 'sechser', '2026-09-14', '2027-01-29'),
           ('zweites', '10', '2026/27', 2, 'sechser', '2027-02-01', '2027-07-28')`,
      );

      await pool.query(
        `UPDATE term SET klassenstufe = 'J1', system = 'punkte'
         WHERE school_year = '2026/27'`,
      );
      const singleRow: Promise<unknown> = pool.query(
        `UPDATE term SET klassenstufe = '9' WHERE id = 'erstes'`,
      );

      await expect(singleRow).rejects.toMatchObject({
        code: '23P01',
        constraint: 'term_school_year_klassenstufe_shared',
      } satisfies Partial<DatabaseError>);
      const terms = await pool.query<{
        readonly id: string;
        readonly klassenstufe: string;
        readonly system: string;
      }>('SELECT id, klassenstufe, system FROM term ORDER BY id');
      expect(terms.rows).toEqual([
        { id: 'erstes', klassenstufe: 'J1', system: 'punkte' },
        { id: 'zweites', klassenstufe: 'J1', system: 'punkte' },
      ]);
      const deferrable = await pool.query<{
        readonly name: string;
        readonly deferrable: boolean;
        readonly deferred: boolean;
      }>(
        `SELECT conname AS name, condeferrable AS deferrable,
                condeferred AS deferred
         FROM pg_constraint
         WHERE conrelid = 'term'::regclass AND contype = 'x'
         ORDER BY conname`,
      );
      expect(deferrable.rows).toEqual([
        {
          name: 'term_school_year_klassenstufe_shared',
          deferrable: true,
          deferred: false,
        },
        {
          name: 'term_school_year_system_shared',
          deferrable: true,
          deferred: false,
        },
      ]);
    }));
});
