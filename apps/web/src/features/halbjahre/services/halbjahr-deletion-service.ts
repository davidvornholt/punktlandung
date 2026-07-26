import { SqlClient } from '@effect/sql/SqlClient';
import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { count, eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { grade, term } from '#/shared/db/schema.ts';
import {
  deleteOrphanedFachstand,
  lockSchuljahrLifecycle,
} from '#/shared/noten/schuljahr-fachstand.ts';
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
        yield* lockSchuljahrLifecycle(halbjahr.schoolYear);
        const [halbjahrCountRow] = yield* db
          .select({ count: count(term.id) })
          .from(term)
          .where(eq(term.schoolYear, halbjahr.schoolYear));
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
          .select({ count: count(grade.id) })
          .from(grade)
          .where(eq(grade.termId, input.id));
        const notenCount = notenCountRow?.count ?? 0;
        if (notenCount > 0) {
          return yield* Effect.fail(
            new HalbjahrDeletionBlockedByNoten({
              halbjahrId: input.id,
              notenCount,
            }),
          );
        }
        yield* db.delete(term).where(eq(term.id, input.id));
        yield* deleteOrphanedFachstand(halbjahr.schoolYear);
      }),
    );
  });
