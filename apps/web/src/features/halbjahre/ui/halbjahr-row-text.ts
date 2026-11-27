import { daysBetween } from '#/shared/date/calendar-date.ts';
import { nbsp, relativeDateText } from '#/shared/date/date-text.ts';
import { notenCountText } from '#/shared/noten/noten-count-text.ts';
import { halbjahrDateRange } from '#/shared/school/school-year.ts';

type Dated = {
  readonly half: 1 | 2;
  readonly schoolYear: string;
  readonly startsOn: string;
  readonly endsOn: string;
};

/**
 * How a Halbjahr stands to today: "läuft noch 66 Tage" or "beginnt in
 * 67 Tagen". A Halbjahr that is over needs no remark.
 */
export const halbjahrStatusText = (
  halbjahr: Pick<Dated, 'startsOn' | 'endsOn'>,
  today: string,
): string | null => {
  if (today < halbjahr.startsOn) {
    return `beginnt ${relativeDateText(today, halbjahr.startsOn)}`;
  }
  if (today > halbjahr.endsOn) {
    return null;
  }
  const left = daysBetween(today, halbjahr.endsOn);
  if (left <= 1) {
    return left === 0 ? 'endet heute' : 'endet morgen';
  }
  return `läuft noch ${left}${nbsp}Tage`;
};

/** Whether the dates are the official ones of the Halbjahr's school year. */
export const hasOfficialDateRange = (halbjahr: Dated): boolean => {
  const official = halbjahrDateRange(halbjahr.schoolYear, halbjahr.half);
  return (
    halbjahr.startsOn === official.startsOn &&
    halbjahr.endsOn === official.endsOn
  );
};

/** The remark under a Halbjahr's dates; `null` when there is nothing to remark. */
export const halbjahrRemark = (
  halbjahr: Dated,
  today: string,
): string | null => {
  const remarks = [
    halbjahrStatusText(halbjahr, today),
    hasOfficialDateRange(halbjahr) ? null : 'abweichender Zeitraum',
  ].filter((remark) => remark !== null);
  return remarks.length === 0 ? null : remarks.join(' · ');
};

/**
 * What a Halbjahr holds: the Noten it has, "12 Noten", and the Leistungen
 * whose Note is still awaited, "6 ausstehend" or `null`. An empty Halbjahr,
 * which can still be deleted, says "keine Noten".
 */
export const halbjahrNotenText = ({
  gradedCount,
  notenCount,
}: {
  readonly gradedCount: number;
  readonly notenCount: number;
}): { readonly noten: string; readonly pending: string | null } => {
  const pending = notenCount - gradedCount;
  return {
    noten: gradedCount === 0 ? 'keine Noten' : notenCountText(gradedCount),
    pending: pending === 0 ? null : `${pending}${nbsp}ausstehend`,
  };
};
