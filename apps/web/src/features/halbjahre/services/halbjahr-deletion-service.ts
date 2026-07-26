import { SqlClient } from '@effect/sql/SqlClient';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { count, eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { halbjahrTable, noteTable } from '#/shared/db/schema.ts';
import {
  deleteOrphanedFachSnapshot,
  lockSchoolYearLifecycle,
} from '#/shared/noten/school-year-fach-lifecycle.ts';
import {
  HalbjahrDeletionBlockedByNoten,
  HalbjahrDeletionConsequenceChanged,
} from '../errors/halbjahr-errors.ts';
import type { HalbjahrDeletionInput } from '../schemas/halbjahr-schema.ts';
import { loadLockedHalbjahr } from './halbjahr-service.ts';

/**
 * Löscht ein leeres Halbjahr nur mit den Folgen, die unter dem
 * Schuljahr-Lifecycle-Lock weiterhin der bestätigten Warnung entsprechen.
 */
export const deleteHalbjahr = (input: HalbjahrDeletionInput) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql.withTransaction(
      Effect.gen(function* () {
        const db = yield* PgDrizzle;
        const halbjahr = yield* loadLockedHalbjahr(input.id);
        yield* lockSchoolYearLifecycle(halbjahr.schoolYear);
        const [halbjahrCountRow] = yield* db
          .select({ count: count(halbjahrTable.id) })
          .from(halbjahrTable)
          .where(eq(halbjahrTable.schoolYear, halbjahr.schoolYear));
        const actualFinalInSchoolYear = (halbjahrCountRow?.count ?? 0) === 1;
        if (actualFinalInSchoolYear !== input.expectedFinalInSchoolYear) {
          return yield* Effect.fail(
            new HalbjahrDeletionConsequenceChanged({
              actualFinalInSchoolYear,
              expectedFinalInSchoolYear: input.expectedFinalInSchoolYear,
              halbjahrId: input.id,
            }),
          );
        }
        const [notenCountRow] = yield* db
          .select({ count: count(noteTable.id) })
          .from(noteTable)
          .where(eq(noteTable.termId, input.id));
        const notenCount = notenCountRow?.count ?? 0;
        if (notenCount > 0) {
          return yield* Effect.fail(
            new HalbjahrDeletionBlockedByNoten({
              halbjahrId: input.id,
              notenCount,
            }),
          );
        }
        yield* db.delete(halbjahrTable).where(eq(halbjahrTable.id, input.id));
        yield* deleteOrphanedFachSnapshot(halbjahr.schoolYear);
      }),
    );
  });
