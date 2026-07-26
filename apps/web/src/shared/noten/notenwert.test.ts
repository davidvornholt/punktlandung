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
  it('hält beide Systeme einschließlich ihrer Endpunkte in 0–15', () => {
    expect(toNotenpunkte(0, 'punkte')).toBe(0);
    expect(toNotenpunkte(15, 'punkte')).toBe(15);
    expect(toNotenpunkte(1, 'sechser')).toBe(14);
    expect(toNotenpunkte(4, 'sechser')).toBe(5);
    expect(toNotenpunkte(6, 'sechser')).toBe(0);
  });

  it('Umrechnung ist außerhalb des geklemmten Endpunkts invertierbar', () => {
    for (const note of [1, 1.5, 2.25, 3, 4.75]) {
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
