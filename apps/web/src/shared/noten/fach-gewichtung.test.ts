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

describe('FachgewichtungSchema', () => {
  for (const kind of ['klausur', 'gfs', 'muendlich', 'sonstige'] as const) {
    it(`weist gesammelt für ${kind} zurück`, () => {
      const result = Schema.decodeUnknownEither(FachgewichtungSchema)(
        mitSammlung(kind, 'gesammelt'),
      );

      expect(result._tag).toBe('Left');
    });
  }

  it('akzeptiert Tests einzeln und gesammelt unverändert', () => {
    for (const sammlung of ['einzeln', 'gesammelt'] as const) {
      const eingabe = mitSammlung('test', sammlung);
      const result = Schema.decodeUnknownSync(FachgewichtungSchema)(eingabe);

      expect(result).toEqual(eingabe);
    }
  });
});
