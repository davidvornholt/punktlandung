import { SqlClient } from '@effect/sql/SqlClient';
import type { SqlError } from '@effect/sql/SqlError';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { grade, term } from '#/shared/db/schema.ts';
import { materialisiereNeuesSchuljahr } from '#/shared/noten/schuljahr-fachstand.ts';
import {
  HalbjahrBelegungDoppelt,
  HalbjahrNichtGefunden,
  HalbjahrSchliesstNotenAus,
  NotensystemMitNotenUnveraenderlich,
  SchuljahrMitNotenUnveraenderlich,
} from '../errors/halbjahr-errors.ts';
import type {
  HalbjahrAktualisierung,
  HalbjahrEingabe,
} from '../schemas/halbjahr-schema.ts';
import { halbjahrVerstoss } from './halbjahr-invarianten.ts';

export type Halbjahr = typeof term.$inferSelect;

const termBelegungConstraint = 'term_school_year_half_unique';

const hatConstraint = (wert: unknown, constraint: string): boolean => {
  if (typeof wert !== 'object' || wert === null) {
    return false;
  }
  const objekt = wert as {
    readonly constraint?: unknown;
    readonly cause?: unknown;
  };
  return (
    objekt.constraint === constraint || hatConstraint(objekt.cause, constraint)
  );
};

const mappeBelegung = (
  fehler: SqlError,
  eingabe: Pick<HalbjahrEingabe, 'schoolYear' | 'half'>,
): Effect.Effect<never, HalbjahrBelegungDoppelt | SqlError> =>
  hatConstraint(fehler, termBelegungConstraint)
    ? Effect.fail(new HalbjahrBelegungDoppelt(eingabe))
    : Effect.fail(fehler);

/** Halbjahre, neuestes zuerst (nach Beginn sortiert). */
export const listHalbjahre = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  return yield* db.select().from(term).orderBy(desc(term.startsOn));
});

export const createHalbjahr = (eingabe: HalbjahrEingabe) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql
      .withTransaction(
        Effect.gen(function* () {
          const db = yield* PgDrizzle;
          const eingefuegt = yield* db
            .insert(term)
            .values({ id: crypto.randomUUID(), ...eingabe })
            .onConflictDoNothing({ target: [term.schoolYear, term.half] })
            .returning({ id: term.id });
          if (eingefuegt.length === 0) {
            return yield* Effect.fail(new HalbjahrBelegungDoppelt(eingabe));
          }
          yield* materialisiereNeuesSchuljahr(eingabe.schoolYear);
        }),
      )
      .pipe(
        Effect.catchTag('SqlError', (fehler) => mappeBelegung(fehler, eingabe)),
      );
  });

export const updateHalbjahr = (eingabe: HalbjahrAktualisierung) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql
      .withTransaction(
        Effect.gen(function* () {
          const db = yield* PgDrizzle;
          const vorhanden = yield* db
            .select()
            .from(term)
            .where(eq(term.id, eingabe.id))
            .for('update');
          const [halbjahr] = vorhanden;
          if (halbjahr === undefined) {
            return yield* Effect.fail(
              new HalbjahrNichtGefunden({ halbjahrId: eingabe.id }),
            );
          }
          const vorhandeneNoten = yield* db
            .select({ takenOn: grade.takenOn })
            .from(grade)
            .where(eq(grade.termId, eingabe.id));
          const verstoss = halbjahrVerstoss(
            halbjahr,
            eingabe,
            vorhandeneNoten.map((note) => note.takenOn),
          );
          if (verstoss === 'notensystem') {
            return yield* Effect.fail(
              new NotensystemMitNotenUnveraenderlich({
                halbjahrId: eingabe.id,
                bisher: halbjahr.system,
                neu: eingabe.system,
              }),
            );
          }
          if (verstoss === 'schoolYear') {
            return yield* Effect.fail(
              new SchuljahrMitNotenUnveraenderlich({
                halbjahrId: eingabe.id,
                bisher: halbjahr.schoolYear,
                neu: eingabe.schoolYear,
              }),
            );
          }
          if (verstoss === 'zeitraum') {
            return yield* Effect.fail(
              new HalbjahrSchliesstNotenAus({
                halbjahrId: eingabe.id,
                startsOn: eingabe.startsOn,
                endsOn: eingabe.endsOn,
              }),
            );
          }
          const { id, ...felder } = eingabe;
          yield* db.update(term).set(felder).where(eq(term.id, id));
          yield* materialisiereNeuesSchuljahr(eingabe.schoolYear);
        }),
      )
      .pipe(
        Effect.catchTag('SqlError', (fehler) => mappeBelegung(fehler, eingabe)),
      );
  });
