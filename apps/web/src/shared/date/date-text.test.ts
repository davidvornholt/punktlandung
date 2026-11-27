import { describe, expect, it } from 'bun:test';

import {
  addDays,
  formatDayMonth,
  formatLongDate,
  formatWeekdayDate,
  relativeDateText,
  relativeDayText,
} from './date-text.ts';

describe('addDays', () => {
  it('geht über Monats- und Jahresgrenzen', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('lässt sich vom Sommerzeitwechsel nicht um einen Tag verschieben', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });
});

describe('Datumstexte', () => {
  it('schreibt Tag und Monat ohne Jahr', () => {
    expect(formatDayMonth('2026-11-16')).toBe('16.11.');
    expect(formatDayMonth('2026')).toBe('2026');
  });

  it('stellt den Wochentag untrennbar vor das Datum', () => {
    expect(formatWeekdayDate('2026-11-16')).toBe('Mo 16.11.');
    expect(formatWeekdayDate('2026-11-22')).toBe('So 22.11.');
  });

  it('schreibt das Datum mit Wochentag und Monatsnamen aus', () => {
    expect(formatLongDate('2026-11-26')).toBe('Donnerstag, 26. November 2026');
    expect(formatLongDate('2027-03-01')).toBe('Montag, 1. März 2027');
  });
});

describe('relativeDayText', () => {
  it('nennt nahe Tage beim Namen und zählt sonst', () => {
    expect(relativeDayText(0)).toBe('heute');
    expect(relativeDayText(1)).toBe('morgen');
    expect(relativeDayText(6)).toBe('in 6 Tagen');
    expect(relativeDayText(-1)).toBe('gestern');
    expect(relativeDayText(-10)).toBe('vor 10 Tagen');
  });

  it('rechnet den Abstand zweier Kalendertage', () => {
    expect(relativeDateText('2026-11-26', '2026-11-28')).toBe('in 2 Tagen');
    expect(relativeDateText('2026-11-26', '2026-11-26')).toBe('heute');
  });
});
