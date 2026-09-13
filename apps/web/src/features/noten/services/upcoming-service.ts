import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { eq, isNotNull } from 'drizzle-orm';
import { Effect } from 'effect';

import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { halbjahrTable, noteTable, studyDayTable } from '#/shared/db/schema.ts';
import type { SchoolYearFach } from '#/shared/noten/school-year-fach-snapshot.ts';
import { loadSchoolYearFachSnapshot } from '#/shared/noten/school-year-fach-snapshot.ts';
import type { UpcomingHalbjahr } from './upcoming-calculation.ts';
import { calculateUpcoming } from './upcoming-calculation.ts';

/**
 * Alle Leistungen über alle Halbjahre — auch die benoteten, weil der Anteil
 * einer ausstehenden Leistung nur zusammen mit ihren Geschwistern entsteht.
 */
export const loadUpcoming = Effect.gen(function* () {
  const db = yield* PgDrizzle;
  const rows = yield* db
    .select({ note: noteTable, halbjahr: halbjahrTable })
    .from(noteTable)
    .innerJoin(halbjahrTable, eq(noteTable.termId, halbjahrTable.id));
  const studyDays = yield* db
    .select({ day: studyDayTable.day, gradeId: studyDayTable.gradeId })
    .from(studyDayTable)
    .where(isNotNull(studyDayTable.gradeId));
  const studyDaysByLeistung = new Map<string, Array<string>>();
  for (const { day, gradeId } of studyDays) {
    if (gradeId !== null) {
      studyDaysByLeistung.set(gradeId, [
        ...(studyDaysByLeistung.get(gradeId) ?? []),
        day,
      ]);
    }
  }
  const halbjahre = new Map<string, UpcomingHalbjahr>();
  const faecherBySchoolYear = new Map<string, ReadonlyArray<SchoolYearFach>>();
  for (const { halbjahr } of rows) {
    halbjahre.set(halbjahr.id, halbjahr);
    if (!faecherBySchoolYear.has(halbjahr.schoolYear)) {
      faecherBySchoolYear.set(
        halbjahr.schoolYear,
        yield* loadSchoolYearFachSnapshot(halbjahr.schoolYear),
      );
    }
  }
  return calculateUpcoming({
    rows: rows.map(({ note }) => ({
      id: note.id,
      termId: note.termId,
      fachId: note.subjectId,
      kind: note.kind,
      wert: note.value === null ? null : Number(note.value),
      gewicht: Number(note.weight),
      datum: note.takenOn,
      preparation: note.preparation,
    })),
    halbjahre,
    faecherBySchoolYear,
    studyDaysByLeistung,
    today: berlinCalendarDate(),
  });
});
