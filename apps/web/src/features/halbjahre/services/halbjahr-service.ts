import { SqlClient } from '@effect/sql/SqlClient';
import type { SqlError } from '@effect/sql/SqlError';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { count, desc, eq, getTableColumns, inArray, or } from 'drizzle-orm';
import { Effect } from 'effect';

import { halbjahrTable, noteTable } from '#/shared/db/schema.ts';
import {
  deleteOrphanedFachSnapshot,
  lockSchoolYearLifecycle,
} from '#/shared/noten/school-year-fach-lifecycle.ts';
import { materializeNewSchoolYear } from '#/shared/noten/school-year-fach-snapshot.ts';
import type { Klassenstufe } from '#/shared/school/klassenstufe.ts';
import { notensystemForKlassenstufe } from '#/shared/school/klassenstufe.ts';
import {
  HalbjahrAlreadyExists,
  HalbjahrExcludesNoten,
  HalbjahrNotFound,
  KlassenstufeCorrectionBlockedByNoten,
  KlassenstufeDiffersInSchoolYear,
  NotensystemImmutableWithNoten,
  SchoolYearImmutableWithNoten,
} from '../errors/halbjahr-errors.ts';
import type {
  HalbjahrInput,
  HalbjahrUpdate,
} from '../schemas/halbjahr-schema.ts';
import {
  findHalbjahrViolation,
  findKlassenstufeMismatch,
} from './halbjahr-invariants.ts';

export type Halbjahr = typeof halbjahrTable.$inferSelect;

/**
 * Ein Halbjahr mit der Anzahl seiner Noten: Sie entscheidet, ob es noch
 * gelöscht werden darf, und gehört deshalb schon in die Liste.
 */
export type HalbjahrWithNotenCount = Halbjahr & {
  readonly notenCount: number;
};

const halbjahrOccupancyConstraint = 'term_school_year_half_unique';

const hasConstraint = (value: unknown, constraint: string): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const object = value as {
    readonly constraint?: unknown;
    readonly cause?: unknown;
  };
  return (
    object.constraint === constraint || hasConstraint(object.cause, constraint)
  );
};

const mapOccupancy = (
  error: SqlError,
  input: Pick<HalbjahrInput, 'schoolYear' | 'half'>,
): Effect.Effect<never, HalbjahrAlreadyExists | SqlError> =>
  hasConstraint(error, halbjahrOccupancyConstraint)
    ? Effect.fail(new HalbjahrAlreadyExists(input))
    : Effect.fail(error);

/** Das Notensystem folgt der Klassenstufe und wird nie vom Aufrufer übernommen. */
const withNotensystem = <
  Fields extends { readonly klassenstufe: Klassenstufe },
>(
  fields: Fields,
) => ({
  ...fields,
  system: notensystemForKlassenstufe(fields.klassenstufe),
});

/**
 * Prüft die Klassenstufe gegen das andere Halbjahr des Schuljahrs. Ein neues
 * oder ins Schuljahr verschobenes Halbjahr mit abweichender Klassenstufe wird
 * abgelehnt. Bei einer Korrektur im eigenen Schuljahr liefert die Prüfung das
 * andere Halbjahr, das mitgeändert werden muss. Läuft hinter
 * `lockSchoolYearLifecycle`, sodass zwei Speichervorgänge sich nicht
 * gegenseitig übersehen; die Exclusion-Constraints auf `term` sichern dieselbe
 * Regel zusätzlich in der Datenbank ab.
 */
const checkSharedKlassenstufe = (
  next: Parameters<typeof findKlassenstufeMismatch>[1],
) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const schoolYearHalbjahre = yield* db
      .select({
        id: halbjahrTable.id,
        schoolYear: halbjahrTable.schoolYear,
        half: halbjahrTable.half,
        klassenstufe: halbjahrTable.klassenstufe,
        system: halbjahrTable.system,
      })
      .from(halbjahrTable)
      .where(eq(halbjahrTable.schoolYear, next.schoolYear));
    const mismatch = findKlassenstufeMismatch(schoolYearHalbjahre, next);
    if (mismatch?.kind === 'conflict') {
      return yield* Effect.fail(
        new KlassenstufeDiffersInSchoolYear({
          schoolYear: mismatch.other.schoolYear,
          half: mismatch.other.half,
          klassenstufe: mismatch.other.klassenstufe,
        }),
      );
    }
    return mismatch?.other ?? null;
  });

/**
 * Setzt die Klassenstufe beider Halbjahre des Schuljahrs in einer Anweisung,
 * denn die Exclusion-Constraints prüfen erst an deren Ende. Wechselt dabei das
 * Notensystem, darf das andere Halbjahr noch keine Noten haben. Seine Zeile
 * ist schon über `loadLockedSchoolYear` gesperrt, sodass keine Note mehr
 * dazukommt, bevor die Transaktion endet.
 */
const correctSchoolYearKlassenstufe = (
  other: Pick<Halbjahr, 'id' | 'schoolYear' | 'half' | 'system'>,
  next: Pick<Halbjahr, 'klassenstufe' | 'system'>,
) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    if (other.system !== next.system) {
      const [notenCountRow] = yield* db
        .select({ count: count(noteTable.id) })
        .from(noteTable)
        .where(eq(noteTable.termId, other.id));
      if ((notenCountRow?.count ?? 0) > 0) {
        return yield* Effect.fail(
          new KlassenstufeCorrectionBlockedByNoten({
            schoolYear: other.schoolYear,
            half: other.half,
            klassenstufe: next.klassenstufe,
          }),
        );
      }
    }
    yield* db
      .update(halbjahrTable)
      .set({ klassenstufe: next.klassenstufe, system: next.system })
      .where(eq(halbjahrTable.schoolYear, other.schoolYear));
  });

/** Halbjahre samt Notenanzahl, neuestes zuerst (nach Beginn sortiert). */
export const listHalbjahre = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  return yield* db
    .select({
      ...getTableColumns(halbjahrTable),
      notenCount: count(noteTable.id),
    })
    .from(halbjahrTable)
    .leftJoin(noteTable, eq(noteTable.termId, halbjahrTable.id))
    .groupBy(halbjahrTable.id)
    .orderBy(desc(halbjahrTable.startsOn));
});

export const loadLockedHalbjahr = (id: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const [halbjahr] = yield* db
      .select()
      .from(halbjahrTable)
      .where(eq(halbjahrTable.id, id))
      .for('update');
    return (
      halbjahr ?? (yield* Effect.fail(new HalbjahrNotFound({ halbjahrId: id })))
    );
  });

/**
 * Sperrt das Halbjahr zusammen mit dem anderen Halbjahr seines Schuljahrs in
 * fester Reihenfolge nach id. Eine Korrektur der Klassenstufe ändert beide
 * Zeilen; würde sie die zweite erst nach `lockSchoolYearLifecycle` sperren,
 * könnte sie sich mit einer gleichzeitigen Bearbeitung des anderen Halbjahrs
 * gegenseitig blockieren.
 */
const loadLockedSchoolYear = (id: string, nextSchoolYear: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const schoolYearOfHalbjahr = db
      .select({ schoolYear: halbjahrTable.schoolYear })
      .from(halbjahrTable)
      .where(eq(halbjahrTable.id, id));
    const rows = yield* db
      .select()
      .from(halbjahrTable)
      .where(
        or(
          eq(halbjahrTable.id, id),
          inArray(halbjahrTable.schoolYear, schoolYearOfHalbjahr),
        ),
      )
      .orderBy(halbjahrTable.id)
      .for('update');
    const halbjahr = rows.find((row) => row.id === id);
    if (halbjahr === undefined) {
      return yield* Effect.fail(new HalbjahrNotFound({ halbjahrId: id }));
    }
    yield* lockSchoolYearLifecycle(halbjahr.schoolYear, nextSchoolYear);
    const currentHalbjahre = yield* db
      .select({ id: halbjahrTable.id })
      .from(halbjahrTable)
      .where(eq(halbjahrTable.schoolYear, halbjahr.schoolYear));
    const lockedIds = new Set(rows.map((row) => row.id));
    // Ein neues Halbjahr kann nach dem SELECT-Snapshot hinzukommen.
    // Ohne Schreibzugriff beenden und alle Sperren freigeben, bevor
    // wir erneut Zeilen sperren: Löschen und Fachänderungen halten
    // ebenfalls erst Zeilensperren und dann den Lifecycle-Lock.
    return currentHalbjahre.every((row) => lockedIds.has(row.id))
      ? halbjahr
      : null;
  });

export const createHalbjahr = (input: HalbjahrInput) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql
      .withTransaction(
        Effect.gen(function* () {
          const db = yield* PgDrizzle;
          yield* lockSchoolYearLifecycle(input.schoolYear);
          yield* checkSharedKlassenstufe({ ...input, id: null });
          const inserted = yield* db
            .insert(halbjahrTable)
            .values({ id: crypto.randomUUID(), ...withNotensystem(input) })
            .onConflictDoNothing({
              target: [halbjahrTable.schoolYear, halbjahrTable.half],
            })
            .returning({ id: halbjahrTable.id });
          if (inserted.length === 0) {
            return yield* Effect.fail(new HalbjahrAlreadyExists(input));
          }
          yield* materializeNewSchoolYear(input.schoolYear);
        }),
      )
      .pipe(Effect.catchTag('SqlError', (error) => mapOccupancy(error, input)));
  });

export const updateHalbjahr = (input: HalbjahrUpdate) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql
      .withTransaction(
        Effect.gen(function* () {
          const db = yield* PgDrizzle;
          const halbjahr = yield* loadLockedSchoolYear(
            input.id,
            input.schoolYear,
          );
          if (halbjahr === null) {
            return false;
          }
          const existingNoten = yield* db
            .select({ takenOn: noteTable.takenOn })
            .from(noteTable)
            .where(eq(noteTable.termId, input.id));
          const { id, ...next } = withNotensystem(input);
          const violation = findHalbjahrViolation(
            halbjahr,
            next,
            existingNoten.map((note) => note.takenOn),
          );
          switch (violation) {
            case 'notensystem':
              return yield* Effect.fail(
                new NotensystemImmutableWithNoten({
                  halbjahrId: input.id,
                  previous: halbjahr.system,
                  next: next.system,
                }),
              );
            case 'schoolYear':
              return yield* Effect.fail(
                new SchoolYearImmutableWithNoten({
                  halbjahrId: input.id,
                  previous: halbjahr.schoolYear,
                  next: input.schoolYear,
                }),
              );
            case 'dateRange':
              return yield* Effect.fail(
                new HalbjahrExcludesNoten({
                  halbjahrId: input.id,
                  startsOn: input.startsOn,
                  endsOn: input.endsOn,
                }),
              );
            default:
              break;
          }
          const other = yield* checkSharedKlassenstufe(input);
          if (other !== null) {
            yield* correctSchoolYearKlassenstufe(other, next);
          }
          yield* db
            .update(halbjahrTable)
            .set(next)
            .where(eq(halbjahrTable.id, id));
          yield* materializeNewSchoolYear(input.schoolYear);
          if (halbjahr.schoolYear !== input.schoolYear) {
            yield* deleteOrphanedFachSnapshot(halbjahr.schoolYear);
          }
          return true;
        }),
      )
      .pipe(
        Effect.repeat({ until: (completed) => completed }),
        Effect.catchTag('SqlError', (error) => mapOccupancy(error, input)),
      );
  });
