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
  const notentendenzen = [
    { note: 0.75, punkte: 15 },
    { note: 1, punkte: 14 },
    { note: 1.25, punkte: 13 },
    { note: 1.75, punkte: 12 },
    { note: 2, punkte: 11 },
    { note: 2.25, punkte: 10 },
    { note: 2.75, punkte: 9 },
    { note: 3, punkte: 8 },
    { note: 3.25, punkte: 7 },
    { note: 3.75, punkte: 6 },
    { note: 4, punkte: 5 },
    { note: 4.25, punkte: 4 },
    { note: 4.75, punkte: 3 },
    { note: 5, punkte: 2 },
    { note: 5.25, punkte: 1 },
    { note: 6, punkte: 0 },
  ] as const;

  it('ordnet jede Notentendenz ihrem ganzen Notenpunktwert zu', () => {
    for (const { note, punkte } of notentendenzen) {
      expect(zuPunkten(note, 'sechser')).toBe(punkte);
      expect(zuSechser(punkte)).toBe(note);
    }
  });

  it('interpoliert Zwischenwerte ohne sie auf ganze Punkte zu runden', () => {
    expect(zuPunkten(1.5, 'sechser')).toBe(12.5);
    expect(zuPunkten(2.5, 'sechser')).toBe(9.5);
    expect(zuPunkten(3.5, 'sechser')).toBe(6.5);
    expect(zuPunkten(4.5, 'sechser')).toBe(3.5);
  });

  it('hält beide Systeme einschließlich ihrer Endpunkte in 0–15', () => {
    expect(zuPunkten(0, 'punkte')).toBe(0);
    expect(zuPunkten(15, 'punkte')).toBe(15);
    expect(zuPunkten(-1, 'punkte')).toBe(0);
    expect(zuPunkten(16, 'punkte')).toBe(15);
    expect(zuPunkten(0.5, 'sechser')).toBe(15);
    expect(zuPunkten(6, 'sechser')).toBe(0);
  });

  it('Umrechnung ist auch zwischen den Ankern invertierbar', () => {
    for (const note of [0.75, 1, 1.5, 2.25, 3, 4.75, 5.5, 6]) {
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
