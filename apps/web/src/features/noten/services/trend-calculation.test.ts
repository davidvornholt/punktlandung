import { describe, expect, it } from 'bun:test';

import { calculateTrend } from './trend-calculation.ts';

const equallyWeighted = {
  writtenShare: null,
  kindWeights: {
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
      { datum: '2026-09-20', punkte: 12, schnitt: 12, fachKuerzel: 'M' },
      { datum: '2026-10-05', punkte: 9, schnitt: 11, fachKuerzel: 'M' },
    ]);
  });

  it('liefert für keine Noten eine leere Liste', () => {
    expect(calculateTrend([])).toEqual([]);
  });

  it('wendet den schriftlich/mündlich-Anteil trotz ungleicher Anzahl an', () => {
    const fachGewichtung = { ...equallyWeighted, writtenShare: 50 };
    const trend = calculateTrend([
      note('M', '2026-09-01', 11, { fachGewichtung }),
      ...[2, 3, 4, 5].map((day) =>
        note('M', `2026-09-0${day}`, 5, {
          wertungsbereich: 'muendlich',
          leistungsart: 'muendlich',
          fachGewichtung,
        }),
      ),
    ]);
    expect(trend.at(-1)?.schnitt).toBe(8);
  });

  it('gewichtet Fächer gleich statt nach ihrer Anzahl an Leistungen', () => {
    const trend = calculateTrend([
      note('M', '2026-09-01', 12),
      note('D', '2026-09-02', 6),
      note('D', '2026-09-03', 6),
      note('D', '2026-09-04', 6),
    ]);
    expect(trend.at(-1)?.schnitt).toBe(9);
  });
});
