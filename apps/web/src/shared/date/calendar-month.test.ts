import { describe, expect, it } from 'bun:test';
import {
  calendarMonth,
  dayInMonth,
  monthOf,
  shiftMonth,
} from './calendar-month.ts';

describe('calendarMonth', () => {
  it('stellt den ersten Tag unter seinen Wochentag', () => {
    // 1 November 2026 is a Sunday: six empty cells before it.
    const november = calendarMonth('2026-11');
    expect(november.title).toBe('November 2026');
    expect(november.leading).toBe(6);
    expect(november.days).toHaveLength(30);
    expect(november.days[0]).toBe('2026-11-01');
    expect(november.days.at(-1)).toBe('2026-11-30');
    // 1 June 2026 is a Monday: no empty cell.
    expect(calendarMonth('2026-06').leading).toBe(0);
  });

  it('kennt den Schalttag', () => {
    expect(calendarMonth('2028-02').days).toHaveLength(29);
    expect(calendarMonth('2027-02').days).toHaveLength(28);
  });
});

describe('shiftMonth', () => {
  it('geht über den Jahreswechsel', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
    expect(shiftMonth('2026-11', 14)).toBe('2028-01');
    expect(shiftMonth('2026-11', 0)).toBe('2026-11');
  });
});

describe('monthOf', () => {
  it('nennt den Monat eines Datums', () => {
    expect(monthOf('2026-11-26')).toBe('2026-11');
  });
});

describe('dayInMonth', () => {
  const range = { min: '2026-09-14', max: '2027-01-31' };

  it('bleibt beim selben Tag des Monats', () => {
    expect(dayInMonth('2026-12', '2026-11-28', range)).toBe('2026-12-28');
  });

  it('nimmt den letzten Tag, wo der Monat kürzer ist', () => {
    const wide = { min: '2026-01-01', max: '2028-12-31' };
    expect(dayInMonth('2027-02', '2027-01-31', wide)).toBe('2027-02-28');
    expect(dayInMonth('2028-02', '2028-01-31', wide)).toBe('2028-02-29');
  });

  it('rückt in den Zeitraum, wo der Tag außerhalb liegt', () => {
    expect(dayInMonth('2026-09', '2026-10-05', range)).toBe('2026-09-14');
    expect(
      dayInMonth('2027-01', '2026-12-31', { ...range, max: '2027-01-10' }),
    ).toBe('2027-01-10');
  });

  it('kennt keinen Tag in einem Monat außerhalb des Zeitraums', () => {
    expect(dayInMonth('2026-08', '2026-09-20', range)).toBeNull();
    expect(dayInMonth('2027-02', '2027-01-20', range)).toBeNull();
  });
});
