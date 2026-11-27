import { formatWeekdayDate, nbsp } from '#/shared/date/date-text.ts';
import { anteilText } from '#/shared/noten/anteil-text.ts';
import type { UpcomingLeistung } from '../services/upcoming-calculation.ts';

/** "Mo 23.11. · zählt 50 %": the date and the share of the Fachschnitt the Note will carry. */
export const whenText = (leistung: UpcomingLeistung): string =>
  `${formatWeekdayDate(leistung.datum)} · zählt${nbsp}${anteilText(leistung.anteil)}`;

/** How long a Note has been missing: "seit gestern", "seit 3 Tagen". */
export const sinceText = (leistung: UpcomingLeistung): string =>
  leistung.tageBis === -1
    ? 'seit gestern'
    : `seit ${-leistung.tageBis}${nbsp}Tagen`;
