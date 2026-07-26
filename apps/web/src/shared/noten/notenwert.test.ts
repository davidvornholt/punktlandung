import { describe, expect, it } from 'bun:test';

import type { Assessment, Fachgewichtung } from './notenwert.ts';
import { fachAverage, toNotenpunkte, toSechser } from './notenwert.ts';

const equallyWeighted: Fachgewichtung = {
  writtenShare: null,
  kindWeights: {
    klausur: 1,
    test: 1,
    muendlich: 1,
    gfs: 1,
    sonstige: 1,
  },
};

const assessment = (
  partial: Partial<Assessment> & { notenwert: number },
): Assessment => ({
  individualGewichtung: 1,
  leistungsart: 'klausur',
  wertungsbereich: 'schriftlich',
  ...partial,
});

describe('toNotenpunkte / toSechser', () => {
  const notenTendencies = [
    { note: 0.75, notenpunkte: 15 },
    { note: 1, notenpunkte: 14 },
    { note: 1.25, notenpunkte: 13 },
    { note: 1.75, notenpunkte: 12 },
    { note: 2, notenpunkte: 11 },
    { note: 2.25, notenpunkte: 10 },
    { note: 2.75, notenpunkte: 9 },
    { note: 3, notenpunkte: 8 },
    { note: 3.25, notenpunkte: 7 },
    { note: 3.75, notenpunkte: 6 },
    { note: 4, notenpunkte: 5 },
    { note: 4.25, notenpunkte: 4 },
    { note: 4.75, notenpunkte: 3 },
    { note: 5, notenpunkte: 2 },
    { note: 5.25, notenpunkte: 1 },
    { note: 6, notenpunkte: 0 },
  ] as const;

  it('ordnet jede Notentendenz ihrem ganzen Notenpunktwert zu', () => {
    for (const { note, notenpunkte } of notenTendencies) {
      expect(toNotenpunkte(note, 'sechser')).toBe(notenpunkte);
      expect(toSechser(notenpunkte)).toBe(note);
    }
  });

  it('interpoliert Zwischenwerte ohne sie auf ganze Punkte zu runden', () => {
    expect(toNotenpunkte(1.5, 'sechser')).toBe(12.5);
    expect(toNotenpunkte(2.5, 'sechser')).toBe(9.5);
    expect(toNotenpunkte(3.5, 'sechser')).toBe(6.5);
    expect(toNotenpunkte(4.5, 'sechser')).toBe(3.5);
  });

  it('hält beide Systeme einschließlich ihrer Endpunkte in 0–15', () => {
    expect(toNotenpunkte(0, 'punkte')).toBe(0);
    expect(toNotenpunkte(15, 'punkte')).toBe(15);
    expect(toNotenpunkte(-1, 'punkte')).toBe(0);
    expect(toNotenpunkte(16, 'punkte')).toBe(15);
    expect(toNotenpunkte(0.5, 'sechser')).toBe(15);
    expect(toNotenpunkte(6, 'sechser')).toBe(0);
    expect(toNotenpunkte(6.5, 'sechser')).toBe(0);
    expect(toSechser(-1)).toBe(6);
    expect(toSechser(16)).toBe(0.75);
  });

  it('erhält NaN in allen Umrechnungspfaden', () => {
    expect(toNotenpunkte(Number.NaN, 'punkte')).toBeNaN();
    expect(toNotenpunkte(Number.NaN, 'sechser')).toBeNaN();
    expect(toSechser(Number.NaN)).toBeNaN();
  });

  it('Umrechnung ist auch zwischen den Ankern invertierbar', () => {
    for (const note of [0.75, 1, 1.5, 2.25, 3, 4.75, 5.5, 6]) {
      expect(toSechser(toNotenpunkte(note, 'sechser'))).toBeCloseTo(note);
    }
  });
});

describe('fachAverage', () => {
  it('leere Liste ergibt null', () => {
    expect(fachAverage([], equallyWeighted)).toBeNull();
  });

  it('gemeinsame Liste: gewichtetes Mittel über Art und Einzelgewicht', () => {
    const gewichtung: Fachgewichtung = {
      writtenShare: null,
      kindWeights: {
        ...equallyWeighted.kindWeights,
        klausur: 2,
      },
    };
    const average = fachAverage(
      [
        assessment({ notenwert: 2, leistungsart: 'klausur' }),
        assessment({
          notenwert: 4,
          leistungsart: 'muendlich',
          wertungsbereich: 'muendlich',
        }),
      ],
      gewichtung,
    );
    expect(average).toBeCloseTo((2 * 2 + 4) / 3);
  });

  it('bereichsweise: verkündeter schriftlich-Anteil gilt', () => {
    const gewichtung: Fachgewichtung = {
      ...equallyWeighted,
      writtenShare: 60,
    };
    const average = fachAverage(
      [
        assessment({ notenwert: 2 }),
        assessment({
          notenwert: 3,
          leistungsart: 'muendlich',
          wertungsbereich: 'muendlich',
        }),
      ],
      gewichtung,
    );
    expect(average).toBeCloseTo(2 * 0.6 + 3 * 0.4);
  });

  it('fehlt ein Bereich, zählt der vorhandene allein', () => {
    const gewichtung: Fachgewichtung = {
      ...equallyWeighted,
      writtenShare: 60,
    };
    expect(
      fachAverage([assessment({ notenwert: 2.5 })], gewichtung),
    ).toBeCloseTo(2.5);
  });
});
