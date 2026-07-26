import { describe, expect, it } from 'bun:test';
import { evaluateFach, fachAverage } from './fach-aggregation.ts';
import { standardgewichtung } from './fach-gewichtung.ts';
import type { Artgewichtung, Assessment, Fachgewichtung } from './notenwert.ts';

const withLeistungsart = (
  fachGewichtung: Fachgewichtung,
  leistungsart: keyof Fachgewichtung['arten'],
  change: Partial<Artgewichtung>,
): Fachgewichtung => ({
  ...fachGewichtung,
  arten: {
    ...fachGewichtung.arten,
    [leistungsart]: {
      ...fachGewichtung.arten[leistungsart],
      ...change,
    },
  },
});

const assessment = (
  partial: Partial<Assessment> & { notenwert: number },
): Assessment => ({
  individualGewichtung: 1,
  leistungsart: 'klausur',
  ...partial,
});

describe('fachAverage', () => {
  it('leere Liste ergibt null', () => {
    expect(fachAverage([], standardgewichtung)).toBeNull();
  });

  it('gemeinsame Liste: gewichtetes Mittel über Art und Einzelgewicht', () => {
    const fachGewichtung = withLeistungsart(standardgewichtung, 'klausur', {
      gewicht: 2,
    });
    const average = fachAverage(
      [
        assessment({ notenwert: 2, leistungsart: 'klausur' }),
        assessment({ notenwert: 4, leistungsart: 'muendlich' }),
      ],
      fachGewichtung,
    );
    expect(average).toBeCloseTo((2 * 2 + 4) / 3);
  });

  it('alle Tests zusammen zählen wie eine Klausur, nicht wie vier', () => {
    const noten = [
      assessment({ notenwert: 2, leistungsart: 'klausur' }),
      assessment({ notenwert: 4, leistungsart: 'klausur' }),
      assessment({ notenwert: 1, leistungsart: 'test' }),
      assessment({ notenwert: 1, leistungsart: 'test' }),
      assessment({ notenwert: 1, leistungsart: 'test' }),
      assessment({ notenwert: 3, leistungsart: 'test' }),
    ];
    // Die Sammelnote der Tests ist 1,5 und tritt als eine einzige Note an.
    expect(fachAverage(noten, standardgewichtung)).toBeCloseTo(
      (2 + 4 + 1.5) / 3,
    );
    const individually = withLeistungsart(standardgewichtung, 'test', {
      sammlung: 'einzeln',
    });
    expect(fachAverage(noten, individually)).toBeCloseTo(12 / 6);
  });

  it('Sammelnote achtet auf das Einzelgewicht innerhalb der Art', () => {
    const noten = [
      assessment({
        notenwert: 1,
        leistungsart: 'test',
        individualGewichtung: 3,
      }),
      assessment({
        notenwert: 5,
        leistungsart: 'test',
        individualGewichtung: 1,
      }),
    ];
    expect(fachAverage(noten, standardgewichtung)).toBeCloseTo(2);
  });

  it('eine GFS tritt neben den Klausuren als eigene Klausur an', () => {
    const average = fachAverage(
      [
        assessment({ notenwert: 3, leistungsart: 'klausur' }),
        assessment({ notenwert: 3, leistungsart: 'klausur' }),
        assessment({ notenwert: 1, leistungsart: 'gfs' }),
      ],
      standardgewichtung,
    );
    expect(average).toBeCloseTo(7 / 3);
  });
});

describe('fachAverage mit Bereichsverhältnis', () => {
  const withRatio = (
    schriftlich: number,
    muendlich: number,
  ): Fachgewichtung => ({
    ...standardgewichtung,
    verhaeltnis: { schriftlich, muendlich },
  });

  const noten = [
    assessment({ notenwert: 2, leistungsart: 'klausur' }),
    assessment({ notenwert: 4, leistungsart: 'muendlich' }),
  ];

  it('"3:1" und "75:25" sind dieselbe Verkündung', () => {
    const threeToOne = fachAverage(noten, withRatio(3, 1));
    expect(threeToOne).toBeCloseTo(2.5);
    expect(fachAverage(noten, withRatio(75, 25))).toBeCloseTo(2.5);
  });

  it('fehlt ein Bereich, zählt der vorhandene allein', () => {
    const onlyWritten = [
      assessment({ notenwert: 2.5, leistungsart: 'klausur' }),
    ];
    expect(fachAverage(onlyWritten, withRatio(60, 40))).toBeCloseTo(2.5);
  });

  it('ein Bereich ohne Anteil zählt nicht mit', () => {
    expect(fachAverage(noten, withRatio(1, 0))).toBeCloseTo(2);
  });

  it('skaliert man einen ganzen Bereich, bleibt der Schnitt gleich', () => {
    const all = [
      ...noten,
      assessment({ notenwert: 1, leistungsart: 'gfs' }),
      assessment({ notenwert: 3, leistungsart: 'sonstige' }),
    ];
    const scaled = (factor: number): Fachgewichtung => ({
      ...withRatio(3, 1),
      arten: {
        klausur: { gewicht: factor, sammlung: 'einzeln' },
        gfs: { gewicht: factor, sammlung: 'einzeln' },
        test: { gewicht: factor, sammlung: 'gesammelt' },
        muendlich: { gewicht: factor, sammlung: 'einzeln' },
        sonstige: { gewicht: factor, sammlung: 'einzeln' },
      },
    });

    expect(fachAverage(all, scaled(4))).toBeCloseTo(
      fachAverage(all, scaled(1)) ?? Number.NaN,
    );
  });

  it('meldet beide Bereichsschnitte für die Vorschau', () => {
    const evaluation = evaluateFach(noten, withRatio(60, 40));
    expect(evaluation.schriftlichAverage).toBeCloseTo(2);
    expect(evaluation.muendlichAverage).toBeCloseTo(4);
    expect(evaluation.average).toBeCloseTo(2 * 0.6 + 4 * 0.4);
  });
});
