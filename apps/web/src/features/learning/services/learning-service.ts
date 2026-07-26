import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { desc, sql } from 'drizzle-orm';
import { Effect } from 'effect';

import { studyDayTable } from '#/shared/db/schema.ts';
import type { StudyDayInput } from '../schemas/study-day-schema.ts';
import { calculateLearningStatistics } from './learning-statistics.ts';

/** Ein Eintrag pro Tag und Fach: vorhandene Einträge werden aktualisiert. */
export const logStudyDay = (input: StudyDayInput) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    yield* db
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
          minutes: sql`excluded.minutes`,
          note: sql`excluded.note`,
        },
      });
  });

const standardLimit = 30;

export const listStudyDays = (limit: number = standardLimit) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    return yield* db
      .select()
      .from(studyDayTable)
      .orderBy(desc(studyDayTable.day))
      .limit(limit);
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
