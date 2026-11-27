import { daysBetween } from './calendar-date.ts';

const weekdaysShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

const weekdaysLong = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
] as const;

export const monthNames = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

/** A non-breaking space: a figure and its unit, or a weekday and its date, stay on one line. */
export const nbsp = ' ';

const isoLength = 10;
const yearLength = 4;

/** Reads an ISO calendar date at UTC midnight, so no time zone can shift the day. */
const utcDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);

/** The calendar date `days` after `isoDate`; negative `days` go back. */
export const addDays = (isoDate: string, days: number): string => {
  const date = utcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, isoLength);
};

/** "16.11." */
export const formatDayMonth = (isoDate: string): string => {
  const [, month, day] = isoDate.split('-');
  return month === undefined || day === undefined
    ? isoDate
    : `${day}.${month}.`;
};

/** "Mo 16.11." */
export const formatWeekdayDate = (isoDate: string): string =>
  `${weekdaysShort[utcDate(isoDate).getUTCDay()]}${nbsp}${formatDayMonth(isoDate)}`;

/** "Mo 16.11.2026" */
export const formatWeekdayFullDate = (isoDate: string): string =>
  `${formatWeekdayDate(isoDate)}${isoDate.slice(0, yearLength)}`;

/** "Montag, 16. November 2026" */
export const formatLongDate = (isoDate: string): string => {
  const date = utcDate(isoDate);
  return `${weekdaysLong[date.getUTCDay()]}, ${date.getUTCDate()}.${nbsp}${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

/** "heute", "morgen", "in 6 Tagen", and looking back "gestern", "vor 10 Tagen". */
export const relativeDayText = (days: number): string => {
  if (days === 0) {
    return 'heute';
  }
  if (days === 1) {
    return 'morgen';
  }
  if (days === -1) {
    return 'gestern';
  }
  return days > 0 ? `in ${days}${nbsp}Tagen` : `vor ${-days}${nbsp}Tagen`;
};

/** How far `isoDate` lies from `today`, in words. */
export const relativeDateText = (today: string, isoDate: string): string =>
  relativeDayText(daysBetween(today, isoDate));
