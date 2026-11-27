import { describe, expect, it } from 'bun:test';
import { calendarMonth, monthOf, shiftMonth } from './calendar-month.ts';

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
