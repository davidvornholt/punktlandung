import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { and, asc, desc, eq, lt, min, ne } from 'drizzle-orm';
import { Effect } from 'effect';

import {
  schoolYearSubject,
  schoolYearSubjectSet,
  subject,
  term,
} from '#/shared/db/schema.ts';
import { dekodiereGewichtung } from './fach-gewichtung.ts';
import type { Fachgewichtung } from './notenwert.ts';

export type SchuljahrFach = {
  readonly id: string;
  readonly schoolYear: string;
  readonly name: string;
  readonly shortName: string;
  readonly gewichtung: Fachgewichtung;
  readonly sortOrder: number;
  readonly archived: boolean;
};

type LegacyFach = typeof subject.$inferSelect;

/**
 * Einziger Dekodierpunkt der Gewichtung: ab hier ist sie getypt, sodass jede
 * Auswertung stromabwärts total bleibt.
 */
const ausLegacy = (fach: LegacyFach, schoolYear: string) =>
  dekodiereGewichtung(fach.weighting, fach.id).pipe(
    Effect.map(
      (gewichtung): SchuljahrFach => ({
        id: fach.id,
        schoolYear,
        name: fach.name,
        shortName: fach.shortName,
        gewichtung,
        sortOrder: fach.sortOrder,
        archived: fach.archived,
      }),
    ),
  );

const ausSchuljahr = (fach: typeof schoolYearSubject.$inferSelect) =>
  dekodiereGewichtung(fach.weighting, fach.subjectId).pipe(
    Effect.map(
      (gewichtung): SchuljahrFach => ({
        id: fach.subjectId,
        schoolYear: fach.schoolYear,
        name: fach.name,
        shortName: fach.shortName,
        gewichtung,
        sortOrder: fach.sortOrder,
        archived: fach.archived,
      }),
    ),
  );

const zuSchuljahrZeile = (fach: SchuljahrFach) => ({
  schoolYear: fach.schoolYear,
  subjectId: fach.id,
  name: fach.name,
  shortName: fach.shortName,
  weighting: fach.gewichtung,
  sortOrder: fach.sortOrder,
  archived: fach.archived,
});

/**
 * Liest den fixierten Fachstand eines Schuljahrs. Vor der einmaligen
 * Materialisierung dienen die unveränderten Legacy-Fächer als Datenbrücke.
 */
export const ladeSchuljahrFachstand = (schoolYear: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const marker = yield* db
      .select({ schoolYear: schoolYearSubjectSet.schoolYear })
      .from(schoolYearSubjectSet)
      .where(eq(schoolYearSubjectSet.schoolYear, schoolYear));
    if (marker.length === 0) {
      const legacy = yield* db
        .select()
        .from(subject)
        .orderBy(asc(subject.sortOrder), asc(subject.name));
      return yield* Effect.forEach(legacy, (fach) =>
        ausLegacy(fach, schoolYear),
      );
    }
    const faecher = yield* db
      .select()
      .from(schoolYearSubject)
      .where(eq(schoolYearSubject.schoolYear, schoolYear))
      .orderBy(asc(schoolYearSubject.sortOrder), asc(schoolYearSubject.name));
    return yield* Effect.forEach(faecher, ausSchuljahr);
  });

const speichereFachstand = (
  schoolYear: string,
  faecher: ReadonlyArray<SchuljahrFach>,
) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    if (faecher.length > 0) {
      yield* db
        .insert(schoolYearSubject)
        .values(faecher.map(zuSchuljahrZeile))
        .onConflictDoNothing();
    }
    yield* db
      .insert(schoolYearSubjectSet)
      .values({ schoolYear })
      .onConflictDoNothing();
  });

/** Fixiert alle beim Upgrade vorhandenen Schuljahre aus dem Legacy-Stand. */
export const materialisiereBestehendeSchuljahre = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  const schuljahre = yield* db
    .selectDistinct({ schoolYear: term.schoolYear })
    .from(term);
  const marker = yield* db
    .select({ schoolYear: schoolYearSubjectSet.schoolYear })
    .from(schoolYearSubjectSet);
  const fixiert = new Set(marker.map((eintrag) => eintrag.schoolYear));
  const legacy = yield* db
    .select()
    .from(subject)
    .orderBy(asc(subject.sortOrder), asc(subject.name));
  for (const { schoolYear } of schuljahre) {
    if (!fixiert.has(schoolYear)) {
      yield* speichereFachstand(
        schoolYear,
        yield* Effect.forEach(legacy, (fach) => ausLegacy(fach, schoolYear)),
      );
    }
  }
});

/**
 * Fixiert ein neues Schuljahr aus dem zuletzt begonnenen früheren Schuljahr;
 * beim ersten Schuljahr ist der Legacy-Stand die deterministische Quelle.
 */
export const materialisiereNeuesSchuljahr = (schoolYear: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const marker = yield* db
      .select({ schoolYear: schoolYearSubjectSet.schoolYear })
      .from(schoolYearSubjectSet)
      .where(eq(schoolYearSubjectSet.schoolYear, schoolYear));
    if (marker.length > 0) {
      return;
    }
    const zielBeginn = yield* db
      .select({ startsOn: min(term.startsOn) })
      .from(term)
      .where(eq(term.schoolYear, schoolYear));
    const quelle = yield* db
      .select({ schoolYear: term.schoolYear })
      .from(term)
      .where(
        and(
          ne(term.schoolYear, schoolYear),
          lt(term.startsOn, zielBeginn[0]?.startsOn ?? ''),
        ),
      )
      .orderBy(desc(term.startsOn))
      .limit(1);
    const faecher =
      quelle[0] === undefined
        ? yield* db
            .select()
            .from(subject)
            .orderBy(asc(subject.sortOrder), asc(subject.name))
            .pipe(
              Effect.flatMap((legacy) =>
                Effect.forEach(legacy, (fach) => ausLegacy(fach, schoolYear)),
              ),
            )
        : (yield* ladeSchuljahrFachstand(quelle[0].schoolYear)).map((fach) => ({
            ...fach,
            schoolYear,
          }));
    yield* speichereFachstand(schoolYear, faecher);
  });

/**
 * Gegenstück zur Materialisierung: verliert ein Schuljahr sein letztes
 * Halbjahr, gibt es auch seinen fixierten Fachstand frei. Sonst überlebte ein
 * Stand ohne Schuljahr und ein später erneut angelegtes Schuljahr erbte ihn
 * still, statt vom dann aktuellen Vorjahr abzuleiten.
 */
export const verwerfeFachstandOhneHalbjahr = (schoolYear: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const verbleibende = yield* db
      .select({ id: term.id })
      .from(term)
      .where(eq(term.schoolYear, schoolYear))
      .limit(1);
    if (verbleibende.length > 0) {
      return;
    }
    yield* db
      .delete(schoolYearSubject)
      .where(eq(schoolYearSubject.schoolYear, schoolYear));
    yield* db
      .delete(schoolYearSubjectSet)
      .where(eq(schoolYearSubjectSet.schoolYear, schoolYear));
  });
