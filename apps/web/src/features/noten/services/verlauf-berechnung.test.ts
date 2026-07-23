import { describe, expect, it } from 'bun:test';

import { berechneVerlauf } from './verlauf-berechnung.ts';

const gleichgewichtet = {
  writtenShare: null,
  kindWeights: { klausur: 1, test: 1, muendlich: 1, gfs: 1, sonstige: 1 },
} as const;

const note = (
  fachStandId: string,
  datum: string,
  punkte: number,
  overrides: Partial<Parameters<typeof berechneVerlauf>[0][number]> = {},
) => ({
  datum,
  punkte,
  gewicht: 1,
  fachStandId,
  fachKuerzel: fachStandId,
  kind: 'klausur' as const,
  area: 'schriftlich' as const,
  gewichtung: gleichgewichtet,
  ...overrides,
});

describe('berechneVerlauf', () => {
  it('führt den gewichteten Schnitt laufend mit', () => {
    const verlauf = berechneVerlauf([
      note('M', '2026-09-20', 12, { gewicht: 2 }),
      note('M', '2026-10-05', 9),
    ]);
    expect(verlauf).toEqual([
      { datum: '2026-09-20', punkte: 12, schnitt: 12, fachKuerzel: 'M' },
      { datum: '2026-10-05', punkte: 9, schnitt: 11, fachKuerzel: 'M' },
    ]);
  });

  it('liefert für keine Noten eine leere Liste', () => {
    expect(berechneVerlauf([])).toEqual([]);
  });

  it('wendet den schriftlich/mündlich-Anteil trotz ungleicher Anzahl an', () => {
    const gewichtung = { ...gleichgewichtet, writtenShare: 50 };
    const verlauf = berechneVerlauf([
      note('M', '2026-09-01', 11, { gewichtung }),
      ...[2, 3, 4, 5].map((tag) =>
        note('M', `2026-09-0${tag}`, 5, {
          area: 'muendlich',
          kind: 'muendlich',
          gewichtung,
        }),
      ),
    ]);
    expect(verlauf.at(-1)?.schnitt).toBe(8);
  });

  it('gewichtet Fächer gleich statt nach ihrer Anzahl an Leistungen', () => {
    const verlauf = berechneVerlauf([
      note('M', '2026-09-01', 12),
      note('D', '2026-09-02', 6),
      note('D', '2026-09-03', 6),
      note('D', '2026-09-04', 6),
    ]);
    expect(verlauf.at(-1)?.schnitt).toBe(9);
  });
});
