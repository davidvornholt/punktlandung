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
 * Das andere Halbjahr des Schuljahrs, wenn es eine andere Klassenstufe trägt
 * als `next`. Kommt das Halbjahr neu ins Schuljahr, muss es die vorhandene
 * Klassenstufe übernehmen (`conflict`). Ändert ein Halbjahr sie in seinem
 * eigenen Schuljahr, korrigiert es die Klassenstufe des ganzen Schuljahrs
 * (`correction`) und das andere Halbjahr folgt.
 */
export type KlassenstufeMismatch<Halbjahr> = {
  readonly kind: 'conflict' | 'correction';
  readonly other: Halbjahr;
};

/**
 * Ein Schuljahr ist eine Klassenstufe und hat damit ein Notensystem. Ist die
 * Halbjahresnummer schon belegt, gilt null: Die doppelte Belegung wird eigens
 * gemeldet und geht vor. `halbjahre` muss das bearbeitete Halbjahr mit seinem
 * gespeicherten Schuljahr enthalten, sonst gilt es als neu im Schuljahr.
 */
export const findKlassenstufeMismatch = <Halbjahr extends SchoolYearHalbjahr>(
  halbjahre: ReadonlyArray<Halbjahr>,
  next: Omit<SchoolYearHalbjahr, 'id'> & { readonly id: string | null },
): KlassenstufeMismatch<Halbjahr> | null => {
  const others = halbjahre.filter(
    (halbjahr) =>
      halbjahr.id !== next.id && halbjahr.schoolYear === next.schoolYear,
  );
  if (others.some((halbjahr) => halbjahr.half === next.half)) {
    return null;
  }
  const other = others.find(
    (halbjahr) => halbjahr.klassenstufe !== next.klassenstufe,
  );
  if (other === undefined) {
    return null;
  }
  const staysInSchoolYear = halbjahre.some(
    (halbjahr) =>
      halbjahr.id === next.id && halbjahr.schoolYear === next.schoolYear,
  );
  return { kind: staysInSchoolYear ? 'correction' : 'conflict', other };
};
