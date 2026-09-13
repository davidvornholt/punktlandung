import { formatIsoDate } from '#/shared/date/calendar-date.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { UpcomingLeistung } from '../services/upcoming-calculation.ts';

/** „heute", „morgen", „in 6 Tagen" — oder rückwärts „gestern", „vor 10 Tagen". */
export const tageBisText = (tageBis: number): string => {
  if (tageBis === 0) {
    return 'heute';
  }
  if (tageBis === 1) {
    return 'morgen';
  }
  if (tageBis === -1) {
    return 'gestern';
  }
  return tageBis > 0 ? `in ${tageBis} Tagen` : `vor ${-tageBis} Tagen`;
};

/** „Klausur · 19.09.2026 · in 6 Tagen" */
export const terminText = (leistung: UpcomingLeistung): string =>
  `${leistungsartLabel[leistung.kind]} · ${formatIsoDate(leistung.datum)} · ${tageBisText(leistung.tageBis)}`;

/** „Schnitt 11 P." oder „noch kein Schnitt" */
export const fachschnittText = (leistung: UpcomingLeistung): string =>
  leistung.fachschnitt === null
    ? 'noch kein Schnitt'
    : `Schnitt ${formatNote(leistung.fachschnitt, leistung.system)}`;

/**
 * Der Name einer ausstehenden Leistung für Screenreader und Verweise:
 * „Klausur Mathematik am 19.09.2026".
 */
export const upcomingLabel = (leistung: UpcomingLeistung): string =>
  `${leistungsartLabel[leistung.kind]} ${leistung.fachName} am ${formatIsoDate(leistung.datum)}`;

/** Überschrift der Nachfrage nach fehlenden Noten, in der richtigen Zahl. */
export const overdueHeading = (count: number): string =>
  count === 1 ? 'Eine Note fehlt noch' : `${count} Noten fehlen noch`;
