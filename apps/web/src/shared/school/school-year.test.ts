import { describe, expect, it } from 'bun:test';

import {
  halbjahrDateRange,
  halbjahrForDate,
  nextSchoolYear,
  schoolYearForDate,
  schoolYearFromStartYear,
  schoolYearOptions,
} from './school-year.ts';

describe('schoolYearFromStartYear', () => {
  it('kürzt das Folgejahr zweistellig', () => {
    expect(schoolYearFromStartYear(2026)).toBe('2026/27');
  });

  it('füllt den Jahrhundertwechsel auf zwei Stellen auf', () => {
    expect(schoolYearFromStartYear(2099)).toBe('2099/00');
  });
});

describe('schoolYearForDate', () => {
  it('ordnet den 1. August dem beginnenden Schuljahr zu', () => {
    expect(schoolYearForDate('2026-08-01')).toBe('2026/27');
  });

  it('ordnet den 31. Juli noch dem laufenden Schuljahr zu', () => {
    expect(schoolYearForDate('2026-07-31')).toBe('2025/26');
  });

  it('ordnet den Januar dem im Vorjahr begonnenen Schuljahr zu', () => {
    expect(schoolYearForDate('2027-01-31')).toBe('2026/27');
  });
});

describe('halbjahrForDate', () => {
  it('zählt August bis Januar zum ersten Halbjahr', () => {
    expect(halbjahrForDate('2026-08-01')).toBe(1);
    expect(halbjahrForDate('2027-01-31')).toBe(1);
  });

  it('zählt Februar bis Juli zum zweiten Halbjahr', () => {
    expect(halbjahrForDate('2027-02-01')).toBe(2);
    expect(halbjahrForDate('2027-07-31')).toBe(2);
  });
});

describe('halbjahrDateRange', () => {
  it('nutzt die amtlichen Grenzen des ersten Halbjahrs', () => {
    expect(halbjahrDateRange('2026/27', 1)).toEqual({
      startsOn: '2026-08-01',
      endsOn: '2027-01-31',
    });
  });

  it('nutzt die amtlichen Grenzen des zweiten Halbjahrs', () => {
    expect(halbjahrDateRange('2026/27', 2)).toEqual({
      startsOn: '2027-02-01',
      endsOn: '2027-07-31',
    });
  });

  it('deckt das Schuljahr lückenlos und überschneidungsfrei ab', () => {
    const first = halbjahrDateRange('2026/27', 1);
    const second = halbjahrDateRange('2026/27', 2);
    const followingYear = halbjahrDateRange('2027/28', 1);

    expect(first.endsOn < second.startsOn).toBe(true);
    expect(second.endsOn < followingYear.startsOn).toBe(true);
    expect(halbjahrForDate(second.startsOn)).toBe(2);
    expect(schoolYearForDate(second.endsOn)).toBe('2026/27');
  });
});

describe('nextSchoolYear', () => {
  it('zählt das Beginnjahr hoch', () => {
    expect(nextSchoolYear('2026/27')).toBe('2027/28');
  });
});

describe('schoolYearOptions', () => {
  it('reicht vom kommenden Schuljahr zurück und sortiert absteigend', () => {
    const selection = schoolYearOptions('2026-09-01', []);

    expect(selection[0]).toBe('2027/28');
    expect(selection.at(-1)).toBe('2022/23');
    expect([...selection].sort().reverse()).toEqual([...selection]);
  });

  it('ergänzt erfasste Schuljahre außerhalb des Fensters ohne Dubletten', () => {
    const selection = schoolYearOptions('2026-09-01', ['2019/20', '2026/27']);

    expect(selection).toContain('2019/20');
    expect(selection.filter((entry) => entry === '2026/27')).toHaveLength(1);
  });
});
