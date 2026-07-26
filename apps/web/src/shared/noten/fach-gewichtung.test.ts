import { describe, expect, it } from 'bun:test';
import { Schema } from 'effect';

import { FachgewichtungSchema, standardgewichtung } from './fach-gewichtung.ts';
import type { Leistungsart } from './notenwert.ts';

const mitSammlung = (kind: Leistungsart, sammlung: unknown) => ({
  ...standardgewichtung,
  arten: {
    ...standardgewichtung.arten,
    [kind]: {
      ...standardgewichtung.arten[kind],
      sammlung,
    },
  },
});

const mitTestgewicht = (
  gewicht: number,
  sammlung: 'einzeln' | 'gesammelt',
  klausurGewicht = standardgewichtung.arten.klausur.gewicht,
) => ({
  ...standardgewichtung,
  arten: {
    ...standardgewichtung.arten,
    klausur: {
      ...standardgewichtung.arten.klausur,
      gewicht: klausurGewicht,
    },
    test: { gewicht, sammlung },
  },
});

const beliebigeGewichte = [0.25, 3.75, 10] as const;

describe('FachgewichtungSchema', () => {
  for (const kind of ['klausur', 'gfs', 'muendlich', 'sonstige'] as const) {
    it(`weist gesammelt für ${kind} zurück`, () => {
      const result = Schema.decodeUnknownEither(FachgewichtungSchema)(
        mitSammlung(kind, 'gesammelt'),
      );

      expect(result._tag).toBe('Left');
    });
  }

  it('weist gesammelte Tests mit einem anderen Gewicht als die Klausur zurück', () => {
    for (const gewicht of beliebigeGewichte) {
      const result = Schema.decodeUnknownEither(FachgewichtungSchema)(
        mitTestgewicht(gewicht, 'gesammelt', 1),
      );

      expect(result._tag).toBe('Left');
    }
  });

  it('akzeptiert beliebige Testgewichte einzeln unverändert', () => {
    for (const gewicht of beliebigeGewichte) {
      const eingabe = mitTestgewicht(gewicht, 'einzeln');
      const result = Schema.decodeUnknownSync(FachgewichtungSchema)(eingabe);

      expect(result).toEqual(eingabe);
    }
  });

  it('akzeptiert beliebige Testgewichte gesammelt, wenn sie der Klausur entsprechen', () => {
    for (const gewicht of beliebigeGewichte) {
      const eingabe = mitTestgewicht(gewicht, 'gesammelt', gewicht);
      const result = Schema.decodeUnknownSync(FachgewichtungSchema)(eingabe);

      expect(result).toEqual(eingabe);
    }
  });
});
