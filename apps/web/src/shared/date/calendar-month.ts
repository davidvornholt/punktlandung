import { monthNames } from './date-text.ts';

/**
 * One month laid out for a calendar whose weeks begin on Monday. Plain
 * arithmetic in UTC, so it can be tested and no time zone can shift a day.
 */

const monthLength = 7;
const daysPerWeek = 7;
const monthsPerYear = 12;

/** The month an ISO calendar date lies in, as "2026-11". */
export const monthOf = (isoDate: string): string =>
  isoDate.slice(0, monthLength);

const parts = (month: string): { year: number; monthIndex: number } => {
  const [year, number] = month.split('-').map(Number);
  return { year: year ?? 0, monthIndex: (number ?? 1) - 1 };
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** The month `steps` months after `month`; negative `steps` go back. */
export const shiftMonth = (month: string, steps: number): string => {
  const { year, monthIndex } = parts(month);
  const total = year * monthsPerYear + monthIndex + steps;
  return `${Math.floor(total / monthsPerYear)}-${pad((total % monthsPerYear) + 1)}`;
};

export type CalendarMonth = {
  /** "November 2026" */
  readonly title: string;
  /** Empty cells before the first day, so it stands under its weekday. */
  readonly leading: number;
  /** Every day of the month as an ISO calendar date. */
  readonly days: ReadonlyArray<string>;
};

export const calendarMonth = (month: string): CalendarMonth => {
  const { year, monthIndex } = parts(month);
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const length = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return {
    title: `${monthNames[monthIndex] ?? ''} ${year}`,
    // getUTCDay counts from Sunday; the calendar's week begins on Monday.
    leading: (first.getUTCDay() + daysPerWeek - 1) % daysPerWeek,
    days: Array.from({ length }, (_, index) => `${month}-${pad(index + 1)}`),
  };
};

/** How far a key moves the day that has focus, in days; `undefined` for any other key. */
export const calendarKeyStep = (key: string): number | undefined =>
  new Map([
    ['ArrowLeft', -1],
    ['ArrowRight', 1],
    ['ArrowUp', -daysPerWeek],
    ['ArrowDown', daysPerWeek],
  ]).get(key);

export const weekdayHeads = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
