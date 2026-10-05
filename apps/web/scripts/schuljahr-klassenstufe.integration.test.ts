import { describe, expect, it } from 'bun:test';
import { Effect } from 'effect';
import { DatabaseError, type Pool } from 'pg';
import {
  createHalbjahr,
  listHalbjahre,
  updateHalbjahr,
} from '#/features/halbjahre/services/halbjahr-service.ts';
import { migrateDatabase } from '../src/shared/db/migrate.ts';
import {
  countRows,
  firstHalbjahr,
  secondHalbjahr,
  withFach,
} from './halbjahr-fachstand-test-helpers.ts';
import {
  applyMigrationsThrough,
  withPostgresTestDatabase,
} from './postgres-test-database.ts';

const exclusionViolation = '23P01';

const insertTerm = (
  pool: Pool,
  term: {
    readonly id: string;
    readonly klassenstufe: string;
    readonly schoolYear: string;
    readonly half: 1 | 2;
    readonly system: 'sechser' | 'punkte';
  },
) =>
  pool.query(
    `INSERT INTO term (
       id, klassenstufe, school_year, half, system, starts_on, ends_on
     ) VALUES ($1, $2, $3, $4, $5, '2026-09-14', '2027-01-29')`,
    [term.id, term.klassenstufe, term.schoolYear, term.half, term.system],
  );

/** Liefert den Postgres-Fehler einer Anweisung, die scheitern muss. */
const rejection = async (
  statement: Promise<unknown>,
): Promise<DatabaseError> => {
  try {
    await statement;
  } catch (error) {
    if (error instanceof DatabaseError) {
      return error;
    }
    throw error;
  }
  throw new Error('Die Datenbank hätte die Anweisung ablehnen müssen.');
};

/** 2024/25 mischt Klassenstufen, 2025/26 nur Notensysteme; 2026/27 ist einheitlich. */
const legacyTerms = [
  {
    id: 'a1',
    schoolYear: '2024/25',
    half: 1,
    klassenstufe: '8',
    system: 'sechser',
  },
  {
    id: 'a2',
    schoolYear: '2024/25',
    half: 2,
    klassenstufe: '10',
    system: 'sechser',
  },
  {
    id: 'b1',
    schoolYear: '2025/26',
    half: 1,
    klassenstufe: '10',
    system: 'sechser',
  },
  {
    id: 'b2',
    schoolYear: '2025/26',
    half: 2,
    klassenstufe: '10',
    system: 'punkte',
  },
  {
    id: 'c1',
    schoolYear: '2026/27',
    half: 1,
    klassenstufe: '10',
    system: 'sechser',
  },
  {
    id: 'c2',
    schoolYear: '2026/27',
    half: 2,
    klassenstufe: '10',
    system: 'sechser',
  },
] as const;

const seedTerms = async (
  pool: Pool,
  terms: ReadonlyArray<Parameters<typeof insertTerm>[1]>,
): Promise<void> => {
  const [term, ...remaining] = terms;
  if (term !== undefined) {
    await insertTerm(pool, term);
    await seedTerms(pool, remaining);
  }
};

/** Führt die Migration aus, die scheitern muss, und liefert die Postgres-Meldung. */
const migrationFailure = async (pool: Pool): Promise<string> => {
  const result = await Effect.runPromise(Effect.either(migrateDatabase(pool)));
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
  return queryCause.message;
};

const schuljahrConstraints = async (pool: Pool) => {
  const result = await pool.query<{ readonly name: string }>(
    `SELECT conname AS name
     FROM pg_constraint
     WHERE conrelid = 'term'::regclass AND contype = 'x'
     ORDER BY conname`,
  );
  return result.rows.map((row) => row.name);
};

describe('Eine Klassenstufe je Schuljahr beim Speichern', () => {
  it('lehnt beim Anlegen ein Halbjahr mit abweichender Klassenstufe ab', () =>
    withFach(async (provided, pool) => {
      await provided(createHalbjahr(firstHalbjahr));

      const error = await provided(
        Effect.flip(createHalbjahr({ ...secondHalbjahr, klassenstufe: 'J1' })),
      );

      expect(error._tag).toBe('KlassenstufeDiffersInSchoolYear');
      expect(error.message).toBe(
        'Das 1. Halbjahr 2026/27 gehört zur Klasse 10. Beide Halbjahre eines Schuljahrs haben dieselbe Klassenstufe; wähle auch hier Klasse 10.',
      );
      expect(await countRows(pool, 'term', firstHalbjahr.schoolYear)).toBe(1);

      await provided(createHalbjahr(secondHalbjahr));
      expect(await countRows(pool, 'term', firstHalbjahr.schoolYear)).toBe(2);
    }));

  it('lehnt beim Ändern eine abweichende Klassenstufe ab und lässt das Halbjahr unverändert', () =>
    withFach(async (provided) => {
      await provided(createHalbjahr(firstHalbjahr));
      await provided(createHalbjahr(secondHalbjahr));
      const second = (await provided(listHalbjahre)).find(
        (halbjahr) => halbjahr.half === 2,
      );
      if (second === undefined) {
        throw new Error('Das 2. Halbjahr fehlt.');
      }

      const error = await provided(
        Effect.flip(
          updateHalbjahr({
            ...secondHalbjahr,
            id: second.id,
            klassenstufe: '9',
          }),
        ),
      );

      expect(error._tag).toBe('KlassenstufeDiffersInSchoolYear');
      const unchanged = (await provided(listHalbjahre)).find(
        (halbjahr) => halbjahr.id === second.id,
      );
      expect(unchanged?.klassenstufe).toBe('10');
      expect(unchanged?.system).toBe('sechser');
    }));

  it('meldet eine doppelte Halbjahresnummer weiterhin als Belegung', () =>
    withFach(async (provided) => {
      await provided(createHalbjahr(firstHalbjahr));
      await provided(createHalbjahr(secondHalbjahr));
      const second = (await provided(listHalbjahre)).find(
        (halbjahr) => halbjahr.half === 2,
      );
      if (second === undefined) {
        throw new Error('Das 2. Halbjahr fehlt.');
      }

      const created = await provided(
        Effect.flip(createHalbjahr({ ...firstHalbjahr, klassenstufe: 'J1' })),
      );
      const moved = await provided(
        Effect.flip(
          updateHalbjahr({
            ...secondHalbjahr,
            id: second.id,
            half: 1,
            klassenstufe: 'J1',
          }),
        ),
      );

      expect(created._tag).toBe('HalbjahrBelegungDoppelt');
      expect(moved._tag).toBe('HalbjahrBelegungDoppelt');
    }));
});

describe('Eine Klassenstufe je Schuljahr in der Datenbank', () => {
  it('lehnt gemischte Halbjahre eines Schuljahrs ab', () =>
    withPostgresTestDatabase(async (pool) => {
      await Effect.runPromise(migrateDatabase(pool));
      const first = {
        id: 'erstes',
        klassenstufe: '10',
        schoolYear: '2026/27',
        half: 1 as const,
        system: 'sechser' as const,
      };
      await insertTerm(pool, first);

      const mixedKlassenstufe = await rejection(
        insertTerm(pool, {
          ...first,
          id: 'kursstufe',
          half: 2,
          klassenstufe: 'J1',
          system: 'punkte',
        }),
      );
      const mixedSystem = await rejection(
        insertTerm(pool, { ...first, id: 'punkte', half: 2, system: 'punkte' }),
      );
      await insertTerm(pool, { ...first, id: 'zweites', half: 2 });
      const changedLater = await rejection(
        pool.query(
          `UPDATE term SET klassenstufe = 'J1', system = 'punkte' WHERE id = 'zweites'`,
        ),
      );
      await insertTerm(pool, {
        ...first,
        id: 'folgejahr',
        schoolYear: '2027/28',
        klassenstufe: 'J1',
        system: 'punkte',
      });

      expect(mixedKlassenstufe).toMatchObject({
        code: exclusionViolation,
        constraint: 'term_school_year_klassenstufe_shared',
      });
      expect(mixedSystem).toMatchObject({
        code: exclusionViolation,
        constraint: 'term_school_year_system_shared',
      });
      expect(changedLater.code).toBe(exclusionViolation);
      expect(await countRows(pool, 'term', '2026/27')).toBe(2);
    }));

  it('bricht die Migration bei gemischten Schuljahren ab und ändert nichts', () =>
    withPostgresTestDatabase(async (pool) => {
      await applyMigrationsThrough(pool, '0008_lerntag_je_leistung');
      await seedTerms(pool, legacyTerms);

      const message = await migrationFailure(pool);

      expect(message).toContain(
        'Migration abgebrochen: In diesen Schuljahren haben die beiden Halbjahre unterschiedliche Klassenstufen oder Notensysteme: 2024/25, 2025/26.',
      );
      expect(await schuljahrConstraints(pool)).toEqual([]);
      const terms = await pool.query<{ readonly id: string }>(
        `SELECT id FROM term
         WHERE (klassenstufe, system) = ('10', 'sechser')
         ORDER BY id`,
      );
      expect(terms.rows.map((row) => row.id)).toEqual(['a2', 'b1', 'c1', 'c2']);

      await pool.query(
        `UPDATE term SET klassenstufe = '10' WHERE id = 'a1';
         UPDATE term SET system = 'sechser' WHERE id = 'b2';`,
      );
      await Effect.runPromise(migrateDatabase(pool));
      expect(await schuljahrConstraints(pool)).toEqual([
        'term_school_year_klassenstufe_shared',
        'term_school_year_system_shared',
      ]);
    }));
});
