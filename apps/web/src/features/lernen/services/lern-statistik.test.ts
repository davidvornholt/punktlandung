import { describe, expect, it } from 'bun:test';

import { berechneLernStatistik } from './lern-statistik.ts';

describe('berechneLernStatistik', () => {
  it('zählt eindeutige Lerntage im laufenden Monat', () => {
    const statistik = berechneLernStatistik(
      ['2026-07-01', '2026-07-15', '2026-06-30'],
      '2026-07-22',
    );
    expect(statistik.tageDiesenMonat).toBe(2);
  });

  it('zählt die Serie rückwärts ab heute', () => {
    const statistik = berechneLernStatistik(
      ['2026-07-22', '2026-07-21', '2026-07-20', '2026-07-18'],
      '2026-07-22',
    );
    expect(statistik.serie).toBe(3);
  });

  it('lässt die Serie offen, wenn heute noch kein Eintrag existiert', () => {
    const statistik = berechneLernStatistik(
      ['2026-07-21', '2026-07-20'],
      '2026-07-22',
    );
    expect(statistik.serie).toBe(2);
  });

  it('zählt über Monatsgrenzen hinweg', () => {
    const statistik = berechneLernStatistik(
      ['2026-07-01', '2026-06-30'],
      '2026-07-01',
    );
    expect(statistik.serie).toBe(2);
    expect(statistik.tageDiesenMonat).toBe(1);
  });

  it('liefert null-Werte ohne Lerntage', () => {
    expect(berechneLernStatistik([], '2026-07-22')).toEqual({
      tageDiesenMonat: 0,
      serie: 0,
    });
  });
});
