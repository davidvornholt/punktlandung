import { describe, expect, it } from 'bun:test';

import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import { berechneVerlauf } from './verlauf-berechnung.ts';

/** Jede Note zählt für sich — die Sammelregel prüft notenwert.test.ts. */
const gleichgewichtet: Fachgewichtung = {
  verhaeltnis: null,
  arten: {
    klausur: { gewicht: 1, sammlung: 'einzeln' },
    test: { gewicht: 1, sammlung: 'einzeln' },
    muendlich: { gewicht: 1, sammlung: 'einzeln' },
    gfs: { gewicht: 1, sammlung: 'einzeln' },
    sonstige: { gewicht: 1, sammlung: 'einzeln' },
  },
};

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
    const gewichtung: Fachgewichtung = {
      ...gleichgewichtet,
      verhaeltnis: { schriftlich: 50, muendlich: 50 },
    };
    const verlauf = berechneVerlauf([
      note('M', '2026-09-01', 11, { gewichtung }),
      ...[2, 3, 4, 5].map((tag) =>
        note('M', `2026-09-0${tag}`, 5, { kind: 'muendlich', gewichtung }),
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
