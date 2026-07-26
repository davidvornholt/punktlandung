import { isIsoDateInRange } from '#/shared/date/date-range.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';

type HalbjahrSnapshot = {
  readonly schoolYear: string;
  readonly notensystem: Notensystem;
  readonly startsOn: string;
  readonly endsOn: string;
};

export type HalbjahrViolation =
  | 'notensystem'
  | 'schoolYear'
  | 'dateRange'
  | null;

export const findHalbjahrViolation = (
  previous: HalbjahrSnapshot,
  next: HalbjahrSnapshot,
  noteDates: ReadonlyArray<string>,
): HalbjahrViolation => {
  if (noteDates.length > 0 && previous.notensystem !== next.notensystem) {
    return 'notensystem';
  }
  if (noteDates.length > 0 && previous.schoolYear !== next.schoolYear) {
    return 'schoolYear';
  }
  return noteDates.some(
    (date) => !isIsoDateInRange(date, next.startsOn, next.endsOn),
  )
    ? 'dateRange'
    : null;
};
