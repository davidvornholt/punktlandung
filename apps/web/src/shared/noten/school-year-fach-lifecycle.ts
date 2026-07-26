import { SqlClient } from '@effect/sql/SqlClient';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';

import {
  halbjahrTable,
  schoolYearFachSetTable,
  schoolYearFachTable,
} from '#/shared/db/schema.ts';

const lifecycleLockNamespace = 1_416_129_093;

/** Serialisiert den Fachstand-Lifecycle bis zum Transaktionsende. */
export const lockSchoolYearLifecycle = (
  ...schoolYears: ReadonlyArray<string>
) =>
  Effect.gen(function* () {
    const client = yield* SqlClient;
    for (const schoolYear of [...new Set(schoolYears)].sort()) {
      yield* client`SELECT pg_advisory_xact_lock(
        ${lifecycleLockNamespace}, hashtext(${schoolYear})
      )`;
    }
  });

/**
 * Gibt den fixierten Fachstand frei, sobald sein letztes Halbjahr entfällt.
 * Ein später erneut angelegtes Schuljahr leitet damit wieder vom dann
 * aktuellen Vorjahr ab.
 */
export const deleteOrphanedFachSnapshot = (schoolYear: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const remaining = yield* db
      .select({ id: halbjahrTable.id })
      .from(halbjahrTable)
      .where(eq(halbjahrTable.schoolYear, schoolYear))
      .limit(1);
    if (remaining.length > 0) {
      return;
    }
    yield* db
      .delete(schoolYearFachTable)
      .where(eq(schoolYearFachTable.schoolYear, schoolYear));
    yield* db
      .delete(schoolYearFachSetTable)
      .where(eq(schoolYearFachSetTable.schoolYear, schoolYear));
  });
