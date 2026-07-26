import { SqlClient } from '@effect/sql/SqlClient';
import type { SqlError } from '@effect/sql/SqlError';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { count, desc, eq, getTableColumns } from 'drizzle-orm';
import { Effect } from 'effect';

import { grade, term } from '#/shared/db/schema.ts';
import {
  deleteOrphanedFachstand,
  lockSchuljahrLifecycle,
  materialisiereNeuesSchuljahr,
} from '#/shared/noten/schuljahr-fachstand.ts';
import type { Klassenstufe } from '#/shared/schule/klassenstufe.ts';
import { notensystemFuerKlassenstufe } from '#/shared/schule/klassenstufe.ts';
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

/**
 * Ein Halbjahr mit der Anzahl seiner Noten: Sie entscheidet, ob es noch
 * gelöscht werden darf, und gehört deshalb schon in die Liste.
 */
export type HalbjahrWithNotenCount = Halbjahr & {
  readonly notenCount: number;
};

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

/** Das Notensystem folgt der Klassenstufe und wird nie vom Aufrufer übernommen. */
const mitNotensystem = <Felder extends { readonly klassenstufe: Klassenstufe }>(
  felder: Felder,
) => ({ ...felder, system: notensystemFuerKlassenstufe(felder.klassenstufe) });

/** Halbjahre samt Notenanzahl, neuestes zuerst (nach Beginn sortiert). */
export const listHalbjahre = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  return yield* db
    .select({ ...getTableColumns(term), notenCount: count(grade.id) })
    .from(term)
    .leftJoin(grade, eq(grade.termId, term.id))
    .groupBy(term.id)
    .orderBy(desc(term.startsOn));
});

export const loadLockedHalbjahr = (id: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const [halbjahr] = yield* db
      .select()
      .from(term)
      .where(eq(term.id, id))
      .for('update');
    return (
      halbjahr ??
      (yield* Effect.fail(new HalbjahrNichtGefunden({ halbjahrId: id })))
    );
  });

export const createHalbjahr = (eingabe: HalbjahrEingabe) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql
      .withTransaction(
        Effect.gen(function* () {
          const db = yield* PgDrizzle;
          yield* lockSchuljahrLifecycle(eingabe.schoolYear);
          const eingefuegt = yield* db
            .insert(term)
            .values({ id: crypto.randomUUID(), ...mitNotensystem(eingabe) })
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
          const halbjahr = yield* loadLockedHalbjahr(eingabe.id);
          yield* lockSchuljahrLifecycle(
            halbjahr.schoolYear,
            eingabe.schoolYear,
          );
          const vorhandeneNoten = yield* db
            .select({ takenOn: grade.takenOn })
            .from(grade)
            .where(eq(grade.termId, eingabe.id));
          const { id, ...neu } = mitNotensystem(eingabe);
          const verstoss = halbjahrVerstoss(
            halbjahr,
            neu,
            vorhandeneNoten.map((note) => note.takenOn),
          );
          if (verstoss === 'notensystem') {
            return yield* Effect.fail(
              new NotensystemMitNotenUnveraenderlich({
                halbjahrId: eingabe.id,
                bisher: halbjahr.system,
                neu: neu.system,
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
          yield* db.update(term).set(neu).where(eq(term.id, id));
          yield* materialisiereNeuesSchuljahr(eingabe.schoolYear);
          if (halbjahr.schoolYear !== eingabe.schoolYear) {
            yield* deleteOrphanedFachstand(halbjahr.schoolYear);
          }
        }),
      )
      .pipe(
        Effect.catchTag('SqlError', (fehler) => mappeBelegung(fehler, eingabe)),
      );
  });
