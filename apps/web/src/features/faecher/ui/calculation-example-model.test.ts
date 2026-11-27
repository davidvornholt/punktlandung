import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import { calculationExample } from './calculation-example-model.ts';

const nbsp = ' ';

const withVerhaeltnis = (
  schriftlich: number,
  muendlich: number,
): Fachgewichtung => ({
  ...standardgewichtung,
  verhaeltnis: { schriftlich, muendlich },
});

/** Where the discs balance: the mean of their values, weighted by their masses. */
const balancePoint = (example: ReturnType<typeof calculationExample>) =>
  example.ruler.points.reduce(
    (sum, point) => sum + point.mass * (point.value ?? 0),
    0,
  );

const totalMass = (example: ReturnType<typeof calculationExample>) =>
  example.ruler.points.reduce((sum, point) => sum + point.mass, 0);

describe('calculationExample', () => {
  for (const [name, gewichtung] of [
    ['einer gemeinsamen Liste', standardgewichtung],
    ['einem Verhältnis', withVerhaeltnis(60, 40)],
    [
      'einzeln zählenden Tests und doppelten Klausuren',
      {
        verhaeltnis: null,
        arten: {
          ...standardgewichtung.arten,
          klausur: { gewicht: 2, sammlung: 'einzeln' },
          test: { gewicht: 0.5, sammlung: 'einzeln' },
        },
      },
    ],
  ] as const) {
    for (const system of ['punkte', 'sechser'] as const) {
      it(`stellt den Drehpunkt bei ${name} (${system}) unter den gerechneten Schnitt`, () => {
        const example = calculationExample(gewichtung, system);

        expect(totalMass(example)).toBeCloseTo(1, 10);
        expect(balancePoint(example)).toBeCloseTo(
          example.ruler.fulcrum ?? Number.NaN,
          10,
        );
      });
    }
  }

  it('legt jede Beispielnote auf eine eigene ganze Stufe der Punkteskala', () => {
    const values = calculationExample(
      standardgewichtung,
      'punkte',
    ).ruler.points.map((point) => point.value ?? Number.NaN);

    expect(values.every((value) => Number.isInteger(value))).toBe(true);
    expect(new Set(values).size).toBe(values.length);
  });

  it('nennt für gesammelte Tests die Sammelnote und ihren gemeinsamen Anteil', () => {
    const example = calculationExample(standardgewichtung, 'punkte');
    const tests = example.rows.find((entry) => entry.kind === 'test');
    const klausuren = example.rows.find((entry) => entry.kind === 'klausur');

    expect(tests?.noten.map((note) => note.text)).toEqual([
      '8 P.',
      '10 P.',
      '11 P.',
    ]);
    expect(tests?.sammelnote).toBe('9,67 P.');
    expect(tests?.share).toBe(`zusammen 17${nbsp}%`);
    expect(klausuren?.sammelnote).toBeNull();
    expect(klausuren?.share).toBe(`je 17${nbsp}%`);
    expect(example.wertungsbereiche).toBeNull();
  });

  it('nennt mit Verhältnis die Schnitte der beiden Wertungsbereiche', () => {
    const example = calculationExample(withVerhaeltnis(60, 40), 'punkte');

    expect(example.wertungsbereiche).toBe(
      `Schriftlich${nbsp}9,42${nbsp}P.${nbsp}(60${nbsp}%) · mündlich${nbsp}13,5${nbsp}P.${nbsp}(40${nbsp}%)`,
    );
    expect(example.schnitt).toBe('11,05 P.');
    expect(example.summary).toBe(
      'Rechenbeispiel mit 8 erfundenen Noten: Schnitt 11,05 P.',
    );
    expect(
      example.rows.find((entry) => entry.kind === 'muendlich')?.share,
    ).toBe(`20${nbsp}%`);
  });

  it('zeigt in der Sechserskala dieselben Leistungen', () => {
    const example = calculationExample(standardgewichtung, 'sechser');

    expect(
      example.rows.find((entry) => entry.kind === 'klausur')?.noten,
    ).toEqual([
      { id: 'klausur-0', text: '3,25' },
      { id: 'klausur-1', text: '2,75' },
    ]);
  });

  it('lässt ein Verhältnis ohne zählenden Bereich ohne Schnitt', () => {
    const example = calculationExample(withVerhaeltnis(0, 0), 'punkte');

    expect(example.ruler.fulcrum).toBeNull();
    expect(example.schnitt).toBe('–');
    expect(example.wertungsbereiche).toBeNull();
  });
});
