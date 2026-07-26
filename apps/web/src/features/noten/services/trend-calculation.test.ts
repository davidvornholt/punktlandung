import { describe, expect, it } from 'bun:test';

import { calculateTrend } from './trend-calculation.ts';

const equallyWeighted = {
  schriftlichShare: null,
  leistungsartGewichtungen: {
    klausur: 1,
    test: 1,
    muendlich: 1,
    gfs: 1,
    sonstige: 1,
  },
} as const;

const note = (
  fachSnapshotId: string,
  date: string,
  notenpunkte: number,
  overrides: Partial<Parameters<typeof calculateTrend>[0][number]> = {},
) => ({
  date,
  notenpunkte,
  individualGewichtung: 1,
  fachSnapshotId,
  fachShortName: fachSnapshotId,
  leistungsart: 'klausur' as const,
  wertungsbereich: 'schriftlich' as const,
  fachGewichtung: equallyWeighted,
  ...overrides,
});

describe('calculateTrend', () => {
  it('führt den gewichteten Schnitt laufend mit', () => {
    const trend = calculateTrend([
      note('M', '2026-09-20', 12, { individualGewichtung: 2 }),
      note('M', '2026-10-05', 9),
    ]);
    expect(trend).toEqual([
      { date: '2026-09-20', notenpunkte: 12, average: 12, fachShortName: 'M' },
      { date: '2026-10-05', notenpunkte: 9, average: 11, fachShortName: 'M' },
    ]);
  });

  it('liefert für keine Noten eine leere Liste', () => {
    expect(calculateTrend([])).toEqual([]);
  });

  it('wendet den schriftlich/mündlich-Anteil trotz ungleicher Anzahl an', () => {
    const fachGewichtung = { ...equallyWeighted, schriftlichShare: 50 };
    const trend = calculateTrend([
      note('M', '2026-09-01', 11, { fachGewichtung }),
      ...[2, 3, 4, 5].map((tag) =>
        note('M', `2026-09-0${tag}`, 5, {
          wertungsbereich: 'muendlich',
          leistungsart: 'muendlich',
          fachGewichtung,
        }),
      ),
    ]);
    expect(trend.at(-1)?.average).toBe(8);
  });

  it('gewichtet Fächer gleich statt nach ihrer Anzahl an Leistungen', () => {
    const trend = calculateTrend([
      note('M', '2026-09-01', 12),
      note('D', '2026-09-02', 6),
      note('D', '2026-09-03', 6),
      note('D', '2026-09-04', 6),
    ]);
    expect(trend.at(-1)?.average).toBe(9);
  });
});
