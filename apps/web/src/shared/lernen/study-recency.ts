import { daysBetween } from '#/shared/date/calendar-date.ts';

const weekLength = 7;

/**
 * Wie frisch das Lernen für eine Leistung ist. Absichtlich keine Serie:
 * eine gerissene Kette entmutigt, „drei von den letzten sieben Tagen" sagt
 * dasselbe ohne Strafe.
 */
export type StudyRecency = {
  /** Tage seit dem letzten Lerntag; 0 = heute, null = noch nie. */
  readonly daysAgo: number | null;
  /** Lerntage in den letzten sieben Tagen, heute eingeschlossen. */
  readonly inLastWeek: number;
};

/**
 * „noch nicht dafür gelernt", „heute gelernt · 3 von 7 Tagen",
 * „zuletzt vor 4 Tagen gelernt · 1 von 7 Tagen". Nur Tage, nie Zeit — die
 * Zeit misst das Zeiterfassungswerkzeug. Hier, weil Übersicht und
 * Leistungsseite denselben Satz zeigen.
 */
export const studyRecencyText = (lernen: StudyRecency): string => {
  if (lernen.daysAgo === null) {
    return 'noch nicht dafür gelernt';
  }
  const week = `${lernen.inLastWeek} von ${weekLength} Tagen`;
  if (lernen.daysAgo === 0) {
    return `heute gelernt · ${week}`;
  }
  return lernen.daysAgo === 1
    ? `zuletzt gestern gelernt · ${week}`
    : `zuletzt vor ${lernen.daysAgo} Tagen gelernt · ${week}`;
};

export const studyRecency = (
  days: ReadonlyArray<string>,
  today: string,
): StudyRecency => {
  const past = [...new Set(days)].filter((day) => day <= today);
  const latest = past.reduce<string | null>(
    (best, day) => (best === null || day > best ? day : best),
    null,
  );
  return {
    daysAgo: latest === null ? null : daysBetween(latest, today),
    inLastWeek: past.filter((day) => daysBetween(day, today) < weekLength)
      .length,
  };
};
