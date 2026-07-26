import { SqlClient } from '@effect/sql/SqlClient';
import type { SqlError } from '@effect/sql/SqlError';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { halbjahrTable, noteTable } from '#/shared/db/schema.ts';
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
  input: Pick<HalbjahrInput, 'schoolYear' | 'number'>,
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
  notensystem: notensystemForKlassenstufe(fields.klassenstufe),
});

/** Halbjahre, neuestes zuerst (nach Beginn sortiert). */
export const listHalbjahre = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  return yield* db
    .select()
    .from(halbjahrTable)
    .orderBy(desc(halbjahrTable.startsOn));
});

export const createHalbjahr = (input: HalbjahrInput) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql
      .withTransaction(
        Effect.gen(function* () {
          const db = yield* PgDrizzle;
          const inserted = yield* db
            .insert(halbjahrTable)
            .values({ id: crypto.randomUUID(), ...withNotensystem(input) })
            .onConflictDoNothing({
              target: [halbjahrTable.schoolYear, halbjahrTable.number],
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
          const existing = yield* db
            .select()
            .from(halbjahrTable)
            .where(eq(halbjahrTable.id, input.id))
            .for('update');
          const [halbjahr] = existing;
          if (halbjahr === undefined) {
            return yield* Effect.fail(
              new HalbjahrNotFound({ halbjahrId: input.id }),
            );
          }
          const existingNoten = yield* db
            .select({ takenOn: noteTable.takenOn })
            .from(noteTable)
            .where(eq(noteTable.halbjahrId, input.id));
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
                previous: halbjahr.notensystem,
                next: next.notensystem,
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
        }),
      )
      .pipe(Effect.catchTag('SqlError', (error) => mapOccupancy(error, input)));
  });
