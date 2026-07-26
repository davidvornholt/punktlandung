import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { and, asc, desc, eq, lt, min, ne } from 'drizzle-orm';
import { Effect } from 'effect';

import {
  fachTable,
  halbjahrTable,
  schoolYearFachSetTable,
  schoolYearFachTable,
} from '#/shared/db/schema.ts';
import { decodeGewichtung } from './fach-gewichtung.ts';
import type { Fachgewichtung } from './notenwert.ts';

export type SchoolYearFach = {
  readonly id: string;
  readonly schoolYear: string;
  readonly name: string;
  readonly shortName: string;
  readonly gewichtung: Fachgewichtung;
  readonly sortOrder: number;
  readonly archived: boolean;
};

type LegacyFach = typeof fachTable.$inferSelect;

/**
 * Einziger Dekodierpunkt der Gewichtung: ab hier ist sie getypt, sodass jede
 * Auswertung stromabwärts total bleibt.
 */
const fromLegacy = (fach: LegacyFach, schoolYear: string) =>
  decodeGewichtung(fach.weighting, fach.id).pipe(
    Effect.map(
      (gewichtung): SchoolYearFach => ({
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

const fromSchoolYear = (fach: typeof schoolYearFachTable.$inferSelect) =>
  decodeGewichtung(fach.weighting, fach.subjectId).pipe(
    Effect.map(
      (gewichtung): SchoolYearFach => ({
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

const toSchoolYearRow = (fach: SchoolYearFach) => ({
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
export const loadSchoolYearFachSnapshot = (schoolYear: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const marker = yield* db
      .select({ schoolYear: schoolYearFachSetTable.schoolYear })
      .from(schoolYearFachSetTable)
      .where(eq(schoolYearFachSetTable.schoolYear, schoolYear));
    if (marker.length === 0) {
      const legacy = yield* db
        .select()
        .from(fachTable)
        .orderBy(asc(fachTable.sortOrder), asc(fachTable.name));
      return yield* Effect.forEach(legacy, (fach) =>
        fromLegacy(fach, schoolYear),
      );
    }
    const faecher = yield* db
      .select()
      .from(schoolYearFachTable)
      .where(eq(schoolYearFachTable.schoolYear, schoolYear))
      .orderBy(
        asc(schoolYearFachTable.sortOrder),
        asc(schoolYearFachTable.name),
      );
    return yield* Effect.forEach(faecher, fromSchoolYear);
  });

const saveFachSnapshot = (
  schoolYear: string,
  faecher: ReadonlyArray<SchoolYearFach>,
) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    if (faecher.length > 0) {
      yield* db
        .insert(schoolYearFachTable)
        .values(faecher.map(toSchoolYearRow))
        .onConflictDoNothing();
    }
    yield* db
      .insert(schoolYearFachSetTable)
      .values({ schoolYear })
      .onConflictDoNothing();
  });

/** Fixiert alle beim Upgrade vorhandenen Schuljahre aus dem Legacy-Stand. */
export const materializeExistingSchoolYears = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  const schoolYears = yield* db
    .selectDistinct({ schoolYear: halbjahrTable.schoolYear })
    .from(halbjahrTable);
  const marker = yield* db
    .select({ schoolYear: schoolYearFachSetTable.schoolYear })
    .from(schoolYearFachSetTable);
  const fixed = new Set(marker.map((entry) => entry.schoolYear));
  const legacy = yield* db
    .select()
    .from(fachTable)
    .orderBy(asc(fachTable.sortOrder), asc(fachTable.name));
  for (const { schoolYear } of schoolYears) {
    if (!fixed.has(schoolYear)) {
      yield* saveFachSnapshot(
        schoolYear,
        yield* Effect.forEach(legacy, (fach) => fromLegacy(fach, schoolYear)),
      );
    }
  }
});

/**
 * Fixiert ein neues Schuljahr aus dem zuletzt begonnenen früheren Schuljahr;
 * beim ersten Schuljahr ist der Legacy-Stand die deterministische Quelle.
 */
export const materializeNewSchoolYear = (schoolYear: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const marker = yield* db
      .select({ schoolYear: schoolYearFachSetTable.schoolYear })
      .from(schoolYearFachSetTable)
      .where(eq(schoolYearFachSetTable.schoolYear, schoolYear));
    if (marker.length > 0) {
      return;
    }
    const targetStart = yield* db
      .select({ startsOn: min(halbjahrTable.startsOn) })
      .from(halbjahrTable)
      .where(eq(halbjahrTable.schoolYear, schoolYear));
    const source = yield* db
      .select({ schoolYear: halbjahrTable.schoolYear })
      .from(halbjahrTable)
      .where(
        and(
          ne(halbjahrTable.schoolYear, schoolYear),
          lt(halbjahrTable.startsOn, targetStart[0]?.startsOn ?? ''),
        ),
      )
      .orderBy(desc(halbjahrTable.startsOn))
      .limit(1);
    const faecher =
      source[0] === undefined
        ? yield* db
            .select()
            .from(fachTable)
            .orderBy(asc(fachTable.sortOrder), asc(fachTable.name))
            .pipe(
              Effect.flatMap((legacy) =>
                Effect.forEach(legacy, (fach) => fromLegacy(fach, schoolYear)),
              ),
            )
        : (yield* loadSchoolYearFachSnapshot(source[0].schoolYear)).map(
            (fach) => ({
              ...fach,
              schoolYear,
            }),
          );
    yield* saveFachSnapshot(schoolYear, faecher);
  });
