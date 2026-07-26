/**
 * Schuljahr- und Halbjahresgrenzen in Baden-Württemberg. Das Schuljahr läuft
 * vom 1. August bis zum 31. Juli (§ 26 SchG BW), das erste Schulhalbjahr endet
 * am 31. Januar. Beide Halbjahre zusammen decken das Schuljahr lückenlos ab,
 * damit jedes Notendatum in genau ein Halbjahr fällt.
 */

/** Schuljahr im Format "2026/27". */
export const schoolYearPattern = /^\d{4}\/\d{2}$/u;

const yearLength = 4;
const century = 100;

export const isSchoolYear = (value: string): boolean =>
  schoolYearPattern.test(value);

/** Kalenderjahr, in dem das Schuljahr beginnt: 2026 für "2026/27". */
export const schoolYearStartYear = (schoolYear: string): number =>
  Number(schoolYear.slice(0, yearLength));

export const schoolYearFromStartYear = (startYear: number): string =>
  `${startYear}/${`${(startYear + 1) % century}`.padStart(2, '0')}`;

const startMonth = 5;
const endMonth = 7;

const monthFrom = (isoDate: string): number =>
  Number(isoDate.slice(startMonth, endMonth));

const firstHalbjahrStartsInMonth = 8;
const secondHalbjahrStartsInMonth = 2;

/** Das Schuljahr, in das ein ISO-Kalenderdatum fällt. */
export const schoolYearForDate = (isoDate: string): string => {
  const year = Number(isoDate.slice(0, yearLength));
  return schoolYearFromStartYear(
    monthFrom(isoDate) >= firstHalbjahrStartsInMonth ? year : year - 1,
  );
};

/** Das Halbjahr, in das ein ISO-Kalenderdatum fällt. */
export const halbjahrForDate = (isoDate: string): 1 | 2 => {
  const month = monthFrom(isoDate);
  return month >= secondHalbjahrStartsInMonth &&
    month < firstHalbjahrStartsInMonth
    ? 2
    : 1;
};

export const nextSchoolYear = (schoolYear: string): string =>
  schoolYearFromStartYear(schoolYearStartYear(schoolYear) + 1);

/** Amtlicher Zeitraum eines Halbjahrs innerhalb seines Schuljahrs. */
export const halbjahrDateRange = (
  schoolYear: string,
  half: 1 | 2,
): { readonly startsOn: string; readonly endsOn: string } => {
  const start = schoolYearStartYear(schoolYear);
  return half === 1
    ? { startsOn: `${start}-08-01`, endsOn: `${start + 1}-01-31` }
    : { startsOn: `${start + 1}-02-01`, endsOn: `${start + 1}-07-31` };
};

const pastYears = 4;
const futureYears = 1;

/**
 * Auswahlfenster für das Schuljahr, neuestes zuerst: einige Jahre rückwirkend,
 * das kommende Schuljahr sowie jedes bereits erfasste Schuljahr.
 */
export const schoolYearOptions = (
  today: string,
  recorded: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const current = schoolYearStartYear(schoolYearForDate(today));
  const window = Array.from(
    { length: pastYears + futureYears + 1 },
    (_, offset) => schoolYearFromStartYear(current - pastYears + offset),
  );
  return [...new Set([...window, ...recorded])].sort().reverse();
};
