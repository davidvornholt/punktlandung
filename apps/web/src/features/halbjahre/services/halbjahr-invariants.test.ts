import { describe, expect, it } from 'bun:test';

import { findHalbjahrViolation } from './halbjahr-invariants.ts';

const previous = {
  schoolYear: '2026/27',
  notensystem: 'sechser' as const,
  startsOn: '2026-09-01',
  endsOn: '2027-01-31',
};

describe('Halbjahr-Invarianten', () => {
  it('erlaubt einen Systemwechsel nur ohne Noten', () => {
    const notenpunkte = { ...previous, notensystem: 'punkte' as const };
    expect(findHalbjahrViolation(previous, notenpunkte, [])).toBeNull();
    expect(findHalbjahrViolation(previous, notenpunkte, ['2026-10-01'])).toBe(
      'notensystem',
    );
  });

  it('erlaubt Erweiterungen und nur solche Schrumpfungen, die alle Noten enthalten', () => {
    const noten = ['2026-09-01', '2026-10-01', '2027-01-31'];
    expect(
      findHalbjahrViolation(
        previous,
        { ...previous, startsOn: '2026-08-01', endsOn: '2027-02-01' },
        noten,
      ),
    ).toBeNull();
    expect(
      findHalbjahrViolation(
        previous,
        { ...previous, startsOn: '2026-09-02' },
        noten,
      ),
    ).toBe('dateRange');
    expect(
      findHalbjahrViolation(
        previous,
        { ...previous, endsOn: '2027-01-30' },
        noten,
      ),
    ).toBe('dateRange');
  });
});
