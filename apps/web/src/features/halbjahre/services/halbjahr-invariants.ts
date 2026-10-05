import { isIsoDateInRange } from '#/shared/date/date-range.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import type { Klassenstufe } from '#/shared/school/klassenstufe.ts';

type HalbjahrSnapshot = {
  readonly schoolYear: string;
  readonly system: Notensystem;
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
  if (noteDates.length > 0 && previous.system !== next.system) {
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

type SchoolYearHalbjahr = {
  readonly id: string;
  readonly schoolYear: string;
  readonly half: 1 | 2;
  readonly klassenstufe: Klassenstufe;
};

/**
 * Ein Schuljahr ist eine Klassenstufe und hat damit ein Notensystem. Liefert
 * das andere Halbjahr desselben Schuljahrs, wenn es eine andere Klassenstufe
 * trägt als `next`. Ist die Halbjahresnummer schon belegt, gilt null: Die
 * doppelte Belegung wird eigens gemeldet und geht vor.
 */
export const findKlassenstufeConflict = <Halbjahr extends SchoolYearHalbjahr>(
  halbjahre: ReadonlyArray<Halbjahr>,
  next: Omit<SchoolYearHalbjahr, 'id'> & { readonly id: string | null },
): Halbjahr | null => {
  const others = halbjahre.filter(
    (halbjahr) =>
      halbjahr.id !== next.id && halbjahr.schoolYear === next.schoolYear,
  );
  if (others.some((halbjahr) => halbjahr.half === next.half)) {
    return null;
  }
  return (
    others.find((halbjahr) => halbjahr.klassenstufe !== next.klassenstufe) ??
    null
  );
};
