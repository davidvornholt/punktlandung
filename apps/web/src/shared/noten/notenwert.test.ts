import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from './fach-gewichtung.ts';
import type { Artgewichtung, Fachgewichtung, Leistung } from './notenwert.ts';
import {
  fachauswertung,
  fachschnitt,
  zuPunkten,
  zuSechser,
} from './notenwert.ts';

const mitArt = (
  gewichtung: Fachgewichtung,
  kind: keyof Fachgewichtung['arten'],
  aenderung: Partial<Artgewichtung>,
): Fachgewichtung => ({
  ...gewichtung,
  arten: {
    ...gewichtung.arten,
    [kind]: { ...gewichtung.arten[kind], ...aenderung },
  },
});

const leistung = (
  partial: Partial<Leistung> & { value: number },
): Leistung => ({ weight: 1, kind: 'klausur', ...partial });

describe('zuPunkten / zuSechser', () => {
  it('hält beide Systeme einschließlich ihrer Endpunkte in 0–15', () => {
    expect(zuPunkten(0, 'punkte')).toBe(0);
    expect(zuPunkten(15, 'punkte')).toBe(15);
    expect(zuPunkten(1, 'sechser')).toBe(14);
    expect(zuPunkten(4, 'sechser')).toBe(5);
    expect(zuPunkten(6, 'sechser')).toBe(0);
  });

  it('Umrechnung ist außerhalb des geklemmten Endpunkts invertierbar', () => {
    for (const note of [1, 1.5, 2.25, 3, 4.75]) {
      expect(zuSechser(zuPunkten(note, 'sechser'))).toBeCloseTo(note);
    }
  });
});

describe('fachschnitt', () => {
  it('leere Liste ergibt null', () => {
    expect(fachschnitt([], standardgewichtung)).toBeNull();
  });

  it('gemeinsame Liste: gewichtetes Mittel über Art und Einzelgewicht', () => {
    const gewichtung = mitArt(standardgewichtung, 'klausur', { gewicht: 2 });
    const schnitt = fachschnitt(
      [
        leistung({ value: 2, kind: 'klausur' }),
        leistung({ value: 4, kind: 'muendlich' }),
      ],
      gewichtung,
    );
    expect(schnitt).toBeCloseTo((2 * 2 + 4) / 3);
  });

  it('alle Tests zusammen zählen wie eine Klausur, nicht wie vier', () => {
    const noten = [
      leistung({ value: 2, kind: 'klausur' }),
      leistung({ value: 4, kind: 'klausur' }),
      leistung({ value: 1, kind: 'test' }),
      leistung({ value: 1, kind: 'test' }),
      leistung({ value: 1, kind: 'test' }),
      leistung({ value: 3, kind: 'test' }),
    ];
    // Sammelnote der Tests ist 1,5 und tritt als eine einzige Note an.
    expect(fachschnitt(noten, standardgewichtung)).toBeCloseTo(
      (2 + 4 + 1.5) / 3,
    );
    const einzeln = mitArt(standardgewichtung, 'test', { sammlung: 'einzeln' });
    expect(fachschnitt(noten, einzeln)).toBeCloseTo(12 / 6);
  });

  it('Sammelnote achtet auf das Einzelgewicht innerhalb der Art', () => {
    const noten = [
      leistung({ value: 1, kind: 'test', weight: 3 }),
      leistung({ value: 5, kind: 'test', weight: 1 }),
    ];
    expect(fachschnitt(noten, standardgewichtung)).toBeCloseTo(2);
  });

  it('eine GFS tritt neben den Klausuren als eigene Klausur an', () => {
    const schnitt = fachschnitt(
      [
        leistung({ value: 3, kind: 'klausur' }),
        leistung({ value: 3, kind: 'klausur' }),
        leistung({ value: 1, kind: 'gfs' }),
      ],
      standardgewichtung,
    );
    expect(schnitt).toBeCloseTo(7 / 3);
  });
});

describe('fachschnitt mit Bereichsverhältnis', () => {
  const mitVerhaeltnis = (
    schriftlich: number,
    muendlich: number,
  ): Fachgewichtung => ({
    ...standardgewichtung,
    verhaeltnis: { schriftlich, muendlich },
  });

  const noten = [
    leistung({ value: 2, kind: 'klausur' }),
    leistung({ value: 4, kind: 'muendlich' }),
  ];

  it('"3:1" und "75:25" sind dieselbe Verkündung', () => {
    const dreiZuEins = fachschnitt(noten, mitVerhaeltnis(3, 1));
    expect(dreiZuEins).toBeCloseTo(2.5);
    expect(fachschnitt(noten, mitVerhaeltnis(75, 25))).toBeCloseTo(2.5);
  });

  it('fehlt ein Bereich, zählt der vorhandene allein', () => {
    const nurSchriftlich = [leistung({ value: 2.5, kind: 'klausur' })];
    expect(fachschnitt(nurSchriftlich, mitVerhaeltnis(60, 40))).toBeCloseTo(
      2.5,
    );
  });

  it('ein Bereich ohne Anteil zählt nicht mit', () => {
    expect(fachschnitt(noten, mitVerhaeltnis(1, 0))).toBeCloseTo(2);
  });

  it('skaliert man einen ganzen Bereich, bleibt der Schnitt gleich', () => {
    // Diese Invarianz trägt `gewichtWirkt` im Formular: sind alle Arten eines
    // Bereichs gekoppelt, wächst ihr Gewicht im Gleichschritt und verschiebt
    // nichts. Das Formular blendet ein solches Gewicht deshalb aus.
    const alle = [
      ...noten,
      leistung({ value: 1, kind: 'gfs' }),
      leistung({ value: 3, kind: 'sonstige' }),
    ];
    const skaliert = (faktor: number): Fachgewichtung => ({
      ...mitVerhaeltnis(3, 1),
      arten: {
        klausur: { gewicht: faktor, sammlung: 'einzeln' },
        gfs: { gewicht: faktor, sammlung: 'einzeln' },
        test: { gewicht: faktor, sammlung: 'gesammelt' },
        muendlich: { gewicht: faktor, sammlung: 'einzeln' },
        sonstige: { gewicht: faktor, sammlung: 'einzeln' },
      },
    });

    expect(fachschnitt(alle, skaliert(4))).toBeCloseTo(
      fachschnitt(alle, skaliert(1)) ?? Number.NaN,
    );
  });

  it('meldet beide Bereichsschnitte für die Vorschau', () => {
    const auswertung = fachauswertung(noten, mitVerhaeltnis(60, 40));
    expect(auswertung.schriftlich).toBeCloseTo(2);
    expect(auswertung.muendlich).toBeCloseTo(4);
    expect(auswertung.schnitt).toBeCloseTo(2 * 0.6 + 4 * 0.4);
  });
});
