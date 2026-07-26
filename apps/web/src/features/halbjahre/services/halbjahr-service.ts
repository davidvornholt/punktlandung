import { SqlClient } from '@effect/sql/SqlClient';
import type { SqlError } from '@effect/sql/SqlError';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { count, desc, eq, getTableColumns } from 'drizzle-orm';
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
  NotensystemImmutableWithNoten,
  SchoolYearImmutableWithNoten,
} from '../errors/halbjahr-errors.ts';
import type {
  HalbjahrInput,
  HalbjahrUpdate,
} from '../schemas/halbjahr-schema.ts';
import { findHalbjahrViolation } from './halbjahr-invariants.ts';

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

export const createHalbjahr = (input: HalbjahrInput) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql
      .withTransaction(
        Effect.gen(function* () {
          const db = yield* PgDrizzle;
          yield* lockSchoolYearLifecycle(input.schoolYear);
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
          const halbjahr = yield* loadLockedHalbjahr(input.id);
          yield* lockSchoolYearLifecycle(halbjahr.schoolYear, input.schoolYear);
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
          if (violation === 'notensystem') {
            return yield* Effect.fail(
              new NotensystemImmutableWithNoten({
                halbjahrId: input.id,
                previous: halbjahr.system,
                next: next.system,
              }),
            );
          }
          if (violation === 'schoolYear') {
            return yield* Effect.fail(
              new SchoolYearImmutableWithNoten({
                halbjahrId: input.id,
                previous: halbjahr.schoolYear,
                next: input.schoolYear,
              }),
            );
          }
          if (violation === 'dateRange') {
            return yield* Effect.fail(
              new HalbjahrExcludesNoten({
                halbjahrId: input.id,
                startsOn: input.startsOn,
                endsOn: input.endsOn,
              }),
            );
          }
          yield* db
            .update(halbjahrTable)
            .set(next)
            .where(eq(halbjahrTable.id, id));
          yield* materializeNewSchoolYear(input.schoolYear);
          if (halbjahr.schoolYear !== input.schoolYear) {
            yield* deleteOrphanedFachSnapshot(halbjahr.schoolYear);
          }
        }),
      )
      .pipe(Effect.catchTag('SqlError', (error) => mapOccupancy(error, input)));
  });
