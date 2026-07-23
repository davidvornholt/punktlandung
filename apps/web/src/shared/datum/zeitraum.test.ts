import { describe, expect, it } from 'bun:test';

import { begrenzeIsoDatum, istIsoDatumImZeitraum } from './zeitraum.ts';

describe('begrenzeIsoDatum', () => {
  it('wählt für historische und künftige Halbjahre einen gültigen Vorgabewert', () => {
    expect(begrenzeIsoDatum('2027-03-15', '2026-09-01', '2027-01-31')).toBe(
      '2027-01-31',
    );
    expect(begrenzeIsoDatum('2026-08-01', '2026-09-01', '2027-01-31')).toBe(
      '2026-09-01',
    );
    expect(begrenzeIsoDatum('2026-10-01', '2026-09-01', '2027-01-31')).toBe(
      '2026-10-01',
    );
  });

  it('akzeptiert beide Endpunkte und verwirft Daten davor und danach', () => {
    expect(
      istIsoDatumImZeitraum('2026-09-01', '2026-09-01', '2027-01-31'),
    ).toBe(true);
    expect(
      istIsoDatumImZeitraum('2027-01-31', '2026-09-01', '2027-01-31'),
    ).toBe(true);
    expect(
      istIsoDatumImZeitraum('2026-08-31', '2026-09-01', '2027-01-31'),
    ).toBe(false);
    expect(
      istIsoDatumImZeitraum('2027-02-01', '2026-09-01', '2027-01-31'),
    ).toBe(false);
  });
});
