import { describe, expect, it } from 'bun:test';

import {
  calculateTrend,
  gesamtschnitt,
  massesAfter,
  noteMasses,
  type TrendNote,
} from './trend-calculation.ts';

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
  overrides: Partial<TrendNote> = {},
): TrendNote => ({
  id: `${fachSnapshotId}-${date}`,
  date,
  notenpunkte,
  notenwert: notenpunkte,
  notensystem: 'punkte',
  individualGewichtung: 1,
  fachId: fachSnapshotId,
  fachSnapshotId,
  fachShortName: fachSnapshotId,
  fachName: fachSnapshotId,
  leistungsart: 'klausur',
  fachGewichtung: equallyWeighted,
  halbjahrId: 'hj-1',
  klassenstufe: 'J1',
  half: 1,
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

  it('reicht Note, Notensystem, Fach, Leistungsart und Halbjahr an den Punkt durch', () => {
    const [entry] = calculateTrend([
      note('M', '2026-09-20', 11, {
        id: 'note-1',
        notenwert: 2,
        notensystem: 'sechser',
        fachId: 'mathe',
        fachName: 'Mathematik',
        leistungsart: 'gfs',
        halbjahrId: 'hj-10-2',
        klassenstufe: '10',
        half: 2,
      }),
    ]);
    expect(entry).toEqual({
      id: 'note-1',
      datum: '2026-09-20',
      punkte: 11,
      schnitt: 11,
      fachSnapshotId: 'M',
      individualGewichtung: 1,
      fachGewichtung: equallyWeighted,
      fachId: 'mathe',
      fachKuerzel: 'M',
      fachName: 'Mathematik',
      notenwert: 2,
      notensystem: 'sechser',
      leistungsart: 'gfs',
      halbjahrId: 'hj-10-2',
      klassenstufe: '10',
      half: 2,
    });
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

  it('führt keinen Schnitt, solange keine Note in einen Fachschnitt eingeht', () => {
    const fachGewichtung = {
      ...equallyWeighted,
      verhaeltnis: { schriftlich: 0, muendlich: 100 },
    };
    const trend = calculateTrend([
      note('M', '2026-09-01', 12, { fachGewichtung }),
      note('M', '2026-09-02', 9, { leistungsart: 'muendlich', fachGewichtung }),
    ]);
    expect(trend.map(({ schnitt }) => schnitt)).toEqual([null, 9]);
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

/** Where the points balance: the sum of mass times Notenpunkte. */
const balancePoint = (noten: ReadonlyArray<TrendNote>): number => {
  const masses = noteMasses(noten);
  return noten.reduce(
    (sum, entry) => sum + (masses.get(entry.id) ?? 0) * entry.notenpunkte,
    0,
  );
};

const totalMass = (noten: ReadonlyArray<TrendNote>): number =>
  [...noteMasses(noten).values()].reduce((sum, mass) => sum + mass, 0);

describe('noteMasses', () => {
  const twoToOne = {
    ...equallyWeighted,
    verhaeltnis: { schriftlich: 2, muendlich: 1 },
  };
  const collected = {
    ...equallyWeighted,
    arten: {
      ...equallyWeighted.arten,
      klausur: { gewicht: 2, sammlung: 'einzeln' },
      test: { gewicht: 1, sammlung: 'gesammelt' },
    },
  } as const;
  /** Three Fächer over two Schuljahre, each weighted another way. */
  const noten = [
    note('2025:M', '2025-10-01', 7.25, { individualGewichtung: 2 }),
    note('2025:M', '2025-11-12', 12.5, { leistungsart: 'muendlich' }),
    note('2025:D', '2025-10-08', 9, { fachGewichtung: twoToOne }),
    note('2025:D', '2025-12-01', 14, {
      fachGewichtung: twoToOne,
      leistungsart: 'muendlich',
    }),
    note('2025:D', '2026-01-15', 4, {
      fachGewichtung: twoToOne,
      leistungsart: 'muendlich',
      individualGewichtung: 0.5,
    }),
    note('2026:M', '2026-09-20', 11, { fachGewichtung: collected }),
    note('2026:M', '2026-10-02', 6, {
      fachGewichtung: collected,
      leistungsart: 'test',
    }),
    note('2026:M', '2026-10-20', 13, {
      fachGewichtung: collected,
      leistungsart: 'test',
      individualGewichtung: 3,
    }),
    note('2026:E', '2026-10-05', 15),
  ];

  it('wiegt jede Note so, dass die Punkte genau am Gesamtschnitt im Gleichgewicht sind', () => {
    const schnitt = gesamtschnitt(noten);
    expect(schnitt).not.toBeNull();
    expect(balancePoint(noten)).toBeCloseTo(schnitt ?? 0, 10);
    expect(totalMass(noten)).toBeCloseTo(1, 10);
  });

  it('trifft gerundet den Schnitt, den die Übersicht zeigt', () => {
    const shown = calculateTrend(noten).at(-1)?.schnitt;
    expect(Math.round(balancePoint(noten) * 100) / 100).toBe(shown ?? -1);
  });

  it('gibt jedem Fach in jedem Schuljahr gleich viel, wie viele Noten es auch hat', () => {
    const masses = noteMasses(noten);
    const ofFach = (fachSnapshotId: string): number =>
      noten
        .filter((entry) => entry.fachSnapshotId === fachSnapshotId)
        .reduce((sum, entry) => sum + (masses.get(entry.id) ?? 0), 0);
    for (const fach of ['2025:M', '2025:D', '2026:M', '2026:E']) {
      expect(ofFach(fach)).toBeCloseTo(1 / 4, 10);
    }
    expect(masses.get('2026:E-2026-10-05')).toBeCloseTo(1 / 4, 10);
  });

  it('gibt einer Note nichts, deren Fach noch keinen Schnitt hat', () => {
    const onlyOral = {
      ...equallyWeighted,
      verhaeltnis: { schriftlich: 0, muendlich: 100 },
    };
    const waiting = [
      note('M', '2026-09-01', 12, { fachGewichtung: onlyOral }),
      note('D', '2026-09-02', 9),
    ];
    const masses = noteMasses(waiting);
    expect(masses.get('M-2026-09-01')).toBe(0);
    expect(masses.get('D-2026-09-02')).toBe(1);
    expect(balancePoint(waiting)).toBeCloseTo(gesamtschnitt(waiting) ?? 0, 10);
  });

  it('kennt ohne Noten weder Anteile noch einen Gesamtschnitt', () => {
    expect(noteMasses([]).size).toBe(0);
    expect(gesamtschnitt([])).toBeNull();
  });

  it('rechnet aus den Punkten des Verlaufs die Anteile von heute', () => {
    const masses = noteMasses(noten);
    expect(massesAfter(calculateTrend(noten), noten.length)).toEqual(
      noten.map((entry) => masses.get(entry.id) ?? 0),
    );
  });
});

describe('massesAfter', () => {
  /*
   * Fach A gets 0 Notenpunkte, Fach B 12, then Fach A another 0. On the day
   * of the second Note each Fach has one Note and counts half, so the Schnitt
   * is 6; today the two Noten of A share their half.
   */
  const trend = calculateTrend([
    note('A', '2026-09-01', 0),
    note('B', '2026-09-02', 12),
    note('A', '2026-09-03', 0),
  ]);

  it('gibt jeder Note ihren Anteil am Schnitt des gezeigten Tages', () => {
    expect(massesAfter(trend, 1)).toEqual([1, 0, 0]);
    expect(massesAfter(trend, 2)).toEqual([0.5, 0.5, 0]);
    expect(massesAfter(trend, 3)).toEqual([0.25, 0.5, 0.25]);
  });

  it('lässt die Punkte an jedem Tag dort im Gleichgewicht, wo der Schnitt steht', () => {
    for (const [index, entry] of trend.entries()) {
      const masses = massesAfter(trend, index + 1);
      const balance = trend.reduce(
        (sum, other, at) => sum + (masses[at] ?? 0) * other.punkte,
        0,
      );
      expect(balance).toBeCloseTo(entry.schnitt ?? 0, 10);
    }
  });

  it('gibt vor der ersten Note niemandem einen Anteil', () => {
    expect(massesAfter(trend, 0)).toEqual([0, 0, 0]);
  });
});
