import { describe, expect, it } from 'bun:test';

import type { Fachgewichtung, Leistung } from './notenwert.ts';
import { fachschnitt, zuPunkten, zuSechser } from './notenwert.ts';

const gleichgewichtet: Fachgewichtung = {
  writtenShare: null,
  kindWeights: { klausur: 1, test: 1, muendlich: 1, gfs: 1, sonstige: 1 },
};

const leistung = (
  partial: Partial<Leistung> & { value: number },
): Leistung => ({
  weight: 1,
  kind: 'klausur',
  area: 'schriftlich',
  ...partial,
});

describe('zuPunkten / zuSechser', () => {
  it('amtliche Umrechnung: Note 1 = 14 Punkte, Note 4 = 5 Punkte', () => {
    expect(zuPunkten(1, 'sechser')).toBe(14);
    expect(zuPunkten(4, 'sechser')).toBe(5);
    expect(zuPunkten(11, 'punkte')).toBe(11);
  });

  it('Umrechnung ist invertierbar', () => {
    for (const note of [1, 1.5, 2.25, 3, 4.75, 6]) {
      expect(zuSechser(zuPunkten(note, 'sechser'))).toBeCloseTo(note);
    }
  });
});

describe('fachschnitt', () => {
  it('leere Liste ergibt null', () => {
    expect(fachschnitt([], gleichgewichtet)).toBeNull();
  });

  it('gemeinsame Liste: gewichtetes Mittel über Art und Einzelgewicht', () => {
    const gewichtung: Fachgewichtung = {
      writtenShare: null,
      kindWeights: { ...gleichgewichtet.kindWeights, klausur: 2 },
    };
    const schnitt = fachschnitt(
      [
        leistung({ value: 2, kind: 'klausur' }),
        leistung({ value: 4, kind: 'muendlich', area: 'muendlich' }),
      ],
      gewichtung,
    );
    expect(schnitt).toBeCloseTo((2 * 2 + 4) / 3);
  });

  it('bereichsweise: verkündeter schriftlich-Anteil gilt', () => {
    const gewichtung: Fachgewichtung = {
      ...gleichgewichtet,
      writtenShare: 60,
    };
    const schnitt = fachschnitt(
      [
        leistung({ value: 2 }),
        leistung({ value: 3, kind: 'muendlich', area: 'muendlich' }),
      ],
      gewichtung,
    );
    expect(schnitt).toBeCloseTo(2 * 0.6 + 3 * 0.4);
  });

  it('fehlt ein Bereich, zählt der vorhandene allein', () => {
    const gewichtung: Fachgewichtung = {
      ...gleichgewichtet,
      writtenShare: 60,
    };
    expect(fachschnitt([leistung({ value: 2.5 })], gewichtung)).toBeCloseTo(
      2.5,
    );
  });
});
