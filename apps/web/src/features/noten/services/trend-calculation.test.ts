import { describe, expect, it } from 'bun:test';

import { calculateTrend } from './trend-calculation.ts';

const equallyWeighted = {
  verhaeltnis: null,
  arten: {
    klausur: { gewicht: 1, sammlung: 'einzeln' },
    test: { gewicht: 1, sammlung: 'einzeln' },
    muendlich: { gewicht: 1, sammlung: 'einzeln' },
    gfs: { gewicht: 1, sammlung: 'einzeln' },
    sonstige: { gewicht: 1, sammlung: 'einzeln' },
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
  notenwert: notenpunkte,
  notensystem: 'punkte' as const,
  individualGewichtung: 1,
  fachSnapshotId,
  fachShortName: fachSnapshotId,
  fachName: fachSnapshotId,
  leistungsart: 'klausur' as const,
  fachGewichtung: equallyWeighted,
  klassenstufe: 'J1' as const,
  half: 1 as const,
  ...overrides,
});

describe('calculateTrend', () => {
  it('führt den gewichteten Schnitt laufend mit', () => {
    const trend = calculateTrend([
      note('M', '2026-09-20', 12, { individualGewichtung: 2 }),
      note('M', '2026-10-05', 9),
    ]);
    expect(
      trend.map(({ datum, punkte, schnitt }) => ({
        datum,
        punkte,
        schnitt,
      })),
    ).toEqual([
      { datum: '2026-09-20', punkte: 12, schnitt: 12 },
      { datum: '2026-10-05', punkte: 9, schnitt: 11 },
    ]);
  });

  it('reicht Note, Notensystem, Fach, Leistungsart und Halbjahr an den Chartpunkt durch', () => {
    const [entry] = calculateTrend([
      note('M', '2026-09-20', 11, {
        notenwert: 2,
        notensystem: 'sechser',
        fachName: 'Mathematik',
        leistungsart: 'gfs',
        klassenstufe: '10',
        half: 2,
      }),
    ]);
    expect(entry).toEqual({
      datum: '2026-09-20',
      punkte: 11,
      schnitt: 11,
      fachKuerzel: 'M',
      fachName: 'Mathematik',
      notenwert: 2,
      notensystem: 'sechser',
      leistungsart: 'gfs',
      klassenstufe: '10',
      half: 2,
    });
  });

  it('liefert für keine Noten eine leere Liste', () => {
    expect(calculateTrend([])).toEqual([]);
  });

  it('wendet den schriftlich/mündlich-Anteil trotz ungleicher Anzahl an', () => {
    const fachGewichtung = {
      ...equallyWeighted,
      verhaeltnis: { schriftlich: 50, muendlich: 50 },
    };
    const trend = calculateTrend([
      note('M', '2026-09-01', 11, { fachGewichtung }),
      ...[2, 3, 4, 5].map((day) =>
        note('M', `2026-09-0${day}`, 5, {
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
