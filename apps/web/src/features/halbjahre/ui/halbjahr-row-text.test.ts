import { describe, expect, it } from 'bun:test';
import {
  halbjahrNotenText,
  halbjahrRemark,
  halbjahrStatusText,
  hasOfficialDateRange,
} from './halbjahr-row-text.ts';

const first = {
  endsOn: '2027-01-31',
  half: 1,
  schoolYear: '2026/27',
  startsOn: '2026-08-01',
} as const;

describe('halbjahrStatusText', () => {
  it('sagt, wie lange das laufende Halbjahr noch läuft', () => {
    expect(halbjahrStatusText(first, '2026-11-26')).toBe('läuft noch 66 Tage');
    expect(halbjahrStatusText(first, '2026-08-01')).toBe('läuft noch 183 Tage');
    expect(halbjahrStatusText(first, '2027-01-30')).toBe('endet morgen');
    expect(halbjahrStatusText(first, '2027-01-31')).toBe('endet heute');
  });

  it('sagt, wann ein künftiges Halbjahr beginnt', () => {
    expect(halbjahrStatusText(first, '2026-07-31')).toBe('beginnt morgen');
    expect(halbjahrStatusText(first, '2026-07-01')).toBe('beginnt in 31 Tagen');
  });

  it('schweigt zu einem Halbjahr, das vorbei ist', () => {
    expect(halbjahrStatusText(first, '2027-02-01')).toBeNull();
  });
});

describe('halbjahrRemark', () => {
  it('merkt einen abweichenden Zeitraum an', () => {
    const adjusted = { ...first, startsOn: '2026-09-14' };
    expect(hasOfficialDateRange(first)).toBe(true);
    expect(hasOfficialDateRange(adjusted)).toBe(false);
    expect(halbjahrRemark(adjusted, '2026-11-26')).toBe(
      'läuft noch 66 Tage · abweichender Zeitraum',
    );
    expect(halbjahrRemark(adjusted, '2027-03-01')).toBe(
      'abweichender Zeitraum',
    );
  });

  it('hat zu einem vergangenen Halbjahr im amtlichen Zeitraum nichts anzumerken', () => {
    expect(halbjahrRemark(first, '2027-03-01')).toBeNull();
  });
});

describe('halbjahrNotenText', () => {
  it('nennt die Zahl der Noten', () => {
    expect(halbjahrNotenText({ gradedCount: 0, notenCount: 0 })).toEqual({
      noten: 'keine Noten',
      pending: null,
    });
    expect(halbjahrNotenText({ gradedCount: 1, notenCount: 1 }).noten).toBe(
      '1 Note',
    );
    expect(halbjahrNotenText({ gradedCount: 18, notenCount: 18 }).noten).toBe(
      '18 Noten',
    );
  });

  it('zählt Leistungen ohne Note nicht als Noten, sondern nennt sie ausstehend', () => {
    expect(halbjahrNotenText({ gradedCount: 12, notenCount: 18 })).toEqual({
      noten: '12 Noten',
      pending: '6\u00a0ausstehend',
    });
    expect(halbjahrNotenText({ gradedCount: 0, notenCount: 2 })).toEqual({
      noten: 'keine Noten',
      pending: '2\u00a0ausstehend',
    });
  });
});
