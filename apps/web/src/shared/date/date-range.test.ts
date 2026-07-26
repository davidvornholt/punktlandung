import { describe, expect, it } from 'bun:test';

import { clampIsoDate, isIsoDateInRange } from './date-range.ts';

describe('clampIsoDate', () => {
  it('wählt für historische und künftige Halbjahre einen gültigen Vorgabewert', () => {
    expect(clampIsoDate('2027-03-15', '2026-09-01', '2027-01-31')).toBe(
      '2027-01-31',
    );
    expect(clampIsoDate('2026-08-01', '2026-09-01', '2027-01-31')).toBe(
      '2026-09-01',
    );
    expect(clampIsoDate('2026-10-01', '2026-09-01', '2027-01-31')).toBe(
      '2026-10-01',
    );
  });

  it('akzeptiert beide Endpunkte und verwirft Daten davor und danach', () => {
    expect(isIsoDateInRange('2026-09-01', '2026-09-01', '2027-01-31')).toBe(
      true,
    );
    expect(isIsoDateInRange('2027-01-31', '2026-09-01', '2027-01-31')).toBe(
      true,
    );
    expect(isIsoDateInRange('2026-08-31', '2026-09-01', '2027-01-31')).toBe(
      false,
    );
    expect(isIsoDateInRange('2027-02-01', '2026-09-01', '2027-01-31')).toBe(
      false,
    );
  });
});
