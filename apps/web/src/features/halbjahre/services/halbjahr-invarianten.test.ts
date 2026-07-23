import { describe, expect, it } from 'bun:test';

import { halbjahrVerstoss } from './halbjahr-invarianten.ts';

const bisher = {
  schoolYear: '2026/27',
  system: 'sechser' as const,
  startsOn: '2026-09-01',
  endsOn: '2027-01-31',
};

describe('Halbjahr-Invarianten', () => {
  it('erlaubt einen Systemwechsel nur ohne Noten', () => {
    const punkte = { ...bisher, system: 'punkte' as const };
    expect(halbjahrVerstoss(bisher, punkte, [])).toBeNull();
    expect(halbjahrVerstoss(bisher, punkte, ['2026-10-01'])).toBe(
      'notensystem',
    );
  });

  it('erlaubt Erweiterungen und nur solche Schrumpfungen, die alle Noten enthalten', () => {
    const noten = ['2026-09-01', '2026-10-01', '2027-01-31'];
    expect(
      halbjahrVerstoss(
        bisher,
        { ...bisher, startsOn: '2026-08-01', endsOn: '2027-02-01' },
        noten,
      ),
    ).toBeNull();
    expect(
      halbjahrVerstoss(bisher, { ...bisher, startsOn: '2026-09-02' }, noten),
    ).toBe('zeitraum');
    expect(
      halbjahrVerstoss(bisher, { ...bisher, endsOn: '2027-01-30' }, noten),
    ).toBe('zeitraum');
  });
});
