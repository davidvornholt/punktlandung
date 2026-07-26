import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { asc, eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { halbjahrTable, noteTable } from '#/shared/db/schema.ts';
import { toNotenpunkte } from '#/shared/noten/notenwert.ts';
import type { SchoolYearFach } from '#/shared/noten/school-year-fach-snapshot.ts';
import { loadSchoolYearFachSnapshot } from '#/shared/noten/school-year-fach-snapshot.ts';
import { calculateTrend } from './trend-calculation.ts';

/**
 * Alle Noten über alle Halbjahre, mit toNotenpunkte normalisiert und mit
 * laufendem gewichtetem Gesamtschnitt — die Datenreihe der Verlaufslinie.
 */
export const loadTrend = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  const rows = yield* db
    .select({ note: noteTable, halbjahr: halbjahrTable })
    .from(noteTable)
    .innerJoin(halbjahrTable, eq(noteTable.termId, halbjahrTable.id))
    .orderBy(asc(noteTable.takenOn), asc(noteTable.createdAt));
  const fachSnapshots = new Map<string, ReadonlyArray<SchoolYearFach>>();
  for (const { halbjahr } of rows) {
    if (!fachSnapshots.has(halbjahr.schoolYear)) {
      fachSnapshots.set(
        halbjahr.schoolYear,
        yield* loadSchoolYearFachSnapshot(halbjahr.schoolYear),
      );
    }
  }
  return calculateTrend(
    rows.flatMap(({ note, halbjahr }) => {
      const fach = fachSnapshots
        .get(halbjahr.schoolYear)
        ?.find((entry) => entry.id === note.subjectId);
      return fach === undefined
        ? []
        : [
            {
              date: note.takenOn,
              notenpunkte: toNotenpunkte(Number(note.value), halbjahr.system),
              individualGewichtung: Number(note.weight),
              fachSnapshotId: `${halbjahr.schoolYear}:${fach.id}`,
              fachShortName: fach.shortName,
              leistungsart: note.kind,
              fachGewichtung: fach.gewichtung,
            },
          ];
    }),
  );
});
