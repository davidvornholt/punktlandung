import { PgDrizzle } from '@effect/sql-drizzle/Pg';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';

import { isIsoDateInRange } from '#/shared/date/date-range.ts';
import { halbjahrTable } from '#/shared/db/schema.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { loadSchoolYearFachSnapshot } from '#/shared/noten/school-year-fach-snapshot.ts';
import {
  FachNotInSchoolYear,
  HalbjahrNotFound,
  InvalidNotenwert,
  NoteOutsideHalbjahr,
} from '../errors/noten-errors.ts';
import { isFachSelectable, isValueValid } from './noten-validation.ts';

/**
 * Die Invarianten jeder Notenmutation. Sie laufen innerhalb der Transaktion,
 * die auch das Halbjahr sperrt, damit ein gleichzeitiger Halbjahr- oder
 * Fachwechsel sie nicht unterlaufen kann.
 */

export const validateValue = (value: number, system: Notensystem) =>
  isValueValid(value, system)
    ? Effect.void
    : Effect.fail(new InvalidNotenwert({ wert: value, system }));

export const validateDate = (
  date: string,
  halbjahr: Pick<typeof halbjahrTable.$inferSelect, 'startsOn' | 'endsOn'>,
) =>
  isIsoDateInRange(date, halbjahr.startsOn, halbjahr.endsOn)
    ? Effect.void
    : Effect.fail(
        new NoteOutsideHalbjahr({
          datum: date,
          startsOn: halbjahr.startsOn,
          endsOn: halbjahr.endsOn,
        }),
      );

export const loadLockedHalbjahr = (termId: string) =>
  Effect.gen(function* () {
    const db = yield* PgDrizzle;
    const rows = yield* db
      .select()
      .from(halbjahrTable)
      .where(eq(halbjahrTable.id, termId))
      .for('share');
    const [halbjahr] = rows;
    return halbjahr ?? (yield* Effect.fail(new HalbjahrNotFound({ termId })));
  });

/**
 * `currentFachId` ist das Fach, an dem die Note schon hängt — beim Eintragen
 * einer neuen Note `null`. Nur dieses eine Fach darf archiviert sein.
 */
export const validateFach = (
  fachId: string,
  schoolYear: string,
  currentFachId: string | null,
) =>
  Effect.gen(function* () {
    const faecher = yield* loadSchoolYearFachSnapshot(schoolYear);
    const fach = faecher.find((entry) => entry.id === fachId);
    if (!isFachSelectable(fach, currentFachId)) {
      return yield* Effect.fail(
        new FachNotInSchoolYear({ fachId, schoolYear }),
      );
    }
  });
