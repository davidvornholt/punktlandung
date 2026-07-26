import { describe, expect, it } from 'bun:test';
import { Schema } from 'effect';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Leistungsart } from '#/shared/noten/notenwert.ts';
import { FachInput, FachUpdate } from './fach-schema.ts';

const inputWithCollectedKind = (kind: Leistungsart) => ({
  schoolYear: '2026/27',
  name: 'Mathematik',
  shortName: 'M',
  gewichtung: {
    ...standardgewichtung,
    arten: {
      ...standardgewichtung.arten,
      [kind]: {
        ...standardgewichtung.arten[kind],
        sammlung: 'gesammelt',
      },
    },
  },
});

const inputWithTestGewichtung = (
  gewicht: number,
  sammlung: 'einzeln' | 'gesammelt',
  klausurGewicht = standardgewichtung.arten.klausur.gewicht,
) => ({
  schoolYear: '2026/27',
  name: 'Mathematik',
  shortName: 'M',
  gewichtung: {
    ...standardgewichtung,
    arten: {
      ...standardgewichtung.arten,
      klausur: {
        ...standardgewichtung.arten.klausur,
        gewicht: klausurGewicht,
      },
      test: { gewicht, sammlung },
    },
  },
});

const results = (input: ReturnType<typeof inputWithTestGewichtung>) => [
  Schema.decodeUnknownEither(FachInput)(input)._tag,
  Schema.decodeUnknownEither(FachUpdate)({
    ...input,
    id: 'mathematik',
  })._tag,
];

const arbitraryGewichtungen = [0.25, 3.75, 10] as const;

describe('Fach-Eingabegrenzen', () => {
  for (const kind of ['klausur', 'gfs', 'muendlich', 'sonstige'] as const) {
    it(`lassen gesammelt für ${kind} weder beim Anlegen noch beim Ändern zur Persistenz durch`, () => {
      const input = inputWithCollectedKind(kind);

      expect(Schema.decodeUnknownEither(FachInput)(input)._tag).toBe('Left');
      expect(
        Schema.decodeUnknownEither(FachUpdate)({
          ...input,
          id: 'mathematik',
        })._tag,
      ).toBe('Left');
    });
  }
});

describe('Testgewicht an Fach-Eingabegrenzen', () => {
  it('weist abweichende gesammelte Gewichte beim Anlegen und Ändern zurück', () => {
    for (const gewicht of arbitraryGewichtungen) {
      expect(results(inputWithTestGewichtung(gewicht, 'gesammelt'))).toEqual([
        'Left',
        'Left',
      ]);
    }
  });

  it('akzeptiert beliebige einzelne Gewichte beim Anlegen und Ändern', () => {
    for (const gewicht of arbitraryGewichtungen) {
      expect(results(inputWithTestGewichtung(gewicht, 'einzeln'))).toEqual([
        'Right',
        'Right',
      ]);
    }
  });

  it('akzeptiert passende gesammelte Gewichte beim Anlegen und Ändern', () => {
    for (const gewicht of arbitraryGewichtungen) {
      expect(
        results(inputWithTestGewichtung(gewicht, 'gesammelt', gewicht)),
      ).toEqual(['Right', 'Right']);
    }
  });
});
