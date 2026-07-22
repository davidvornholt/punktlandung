import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { desc, sql } from 'drizzle-orm';
import { Effect } from 'effect';

import { studyDay } from '#/shared/db/schema.ts';
import type { LerntagEingabe } from '../schemas/lerntag-schema.ts';
import { berechneLernStatistik } from './lern-statistik.ts';

/** Ein Eintrag pro Tag und Fach: vorhandene Einträge werden aktualisiert. */
export const logLerntag = (eingabe: LerntagEingabe) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    yield* db
      .insert(studyDay)
      .values({
        id: crypto.randomUUID(),
        day: eingabe.day,
        subjectId: eingabe.subjectId,
        minutes: eingabe.minutes,
        note: eingabe.notiz,
      })
      .onConflictDoUpdate({
        target: [studyDay.day, studyDay.subjectId],
        set: {
          minutes: sql`excluded.minutes`,
          note: sql`excluded.note`,
        },
      });
  });

const standardLimit = 30;

export const listLerntage = (limit: number = standardLimit) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    return yield* db
      .select()
      .from(studyDay)
      .orderBy(desc(studyDay.day))
      .limit(limit);
  });

/** Lerntage diesen Monat und aktuelle Serie, bezogen auf `heute`. */
export const ladeLernStatistik = (heute: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const zeilen = yield* db
      .selectDistinct({ day: studyDay.day })
      .from(studyDay)
      .orderBy(desc(studyDay.day));
    return berechneLernStatistik(
      zeilen.map((zeile) => zeile.day),
      heute,
    );
  });
