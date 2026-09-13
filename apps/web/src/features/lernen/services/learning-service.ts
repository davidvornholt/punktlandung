import { SqlClient } from '@effect/sql/SqlClient';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { desc, sql as drizzleSql } from 'drizzle-orm';
import { Effect } from 'effect';

import { studyDayGradeTable, studyDayTable } from '#/shared/db/schema.ts';
import type { StudyDayInput } from '../schemas/study-day-schema.ts';
import { calculateLearningStatistics } from './learning-statistics.ts';

/**
 * Ein Eintrag pro Tag und Fach: vorhandene Einträge werden aktualisiert. Ein
 * allgemeiner Lerntag für das Fach nimmt einer schon eingetragenen Leistung
 * ihren Tag nicht wieder weg.
 */
export const logStudyDay = (input: StudyDayInput) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        const [studyDay] = yield* db
          .insert(studyDayTable)
          .values({
            id: crypto.randomUUID(),
            day: input.day,
            subjectId: input.subjectId,
            minutes: input.minutes,
            note: input.notiz,
          })
          .onConflictDoUpdate({
            target: [studyDayTable.day, studyDayTable.subjectId],
            set: {
              minutes: drizzleSql`excluded.minutes`,
              note: drizzleSql`excluded.note`,
            },
          })
          .returning({ id: studyDayTable.id });
        if (studyDay === undefined) {
          return yield* Effect.dieMessage(
            'Der Lerntag konnte nach dem Speichern nicht gelesen werden.',
          );
        }
        if (input.gradeId !== null) {
          yield* db
            .insert(studyDayGradeTable)
            .values({ studyDayId: studyDay.id, gradeId: input.gradeId })
            .onConflictDoNothing();
        }
      }),
    );
  });

const standardLimit = 30;

export const listStudyDays = (limit: number = standardLimit) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const studyDays = yield* db
      .select()
      .from(studyDayTable)
      .orderBy(desc(studyDayTable.day))
      .limit(limit);
    const associations = yield* db
      .select({
        studyDayId: studyDayGradeTable.studyDayId,
        gradeId: studyDayGradeTable.gradeId,
      })
      .from(studyDayGradeTable);
    const gradeIdsByStudyDay = new Map<string, Array<string>>();
    for (const { studyDayId, gradeId } of associations) {
      gradeIdsByStudyDay.set(studyDayId, [
        ...(gradeIdsByStudyDay.get(studyDayId) ?? []),
        gradeId,
      ]);
    }
    return studyDays.map((studyDay) => ({
      ...studyDay,
      gradeIds: gradeIdsByStudyDay.get(studyDay.id) ?? [],
    }));
  });

/** Lerntage diesen Monat und aktuelle Serie, bezogen auf `heute`. */
export const loadLearningStatistics = (today: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const rows = yield* db
      .selectDistinct({ day: studyDayTable.day })
      .from(studyDayTable)
      .orderBy(desc(studyDayTable.day));
    return calculateLearningStatistics(
      rows.map((row) => row.day),
      today,
    );
  });
