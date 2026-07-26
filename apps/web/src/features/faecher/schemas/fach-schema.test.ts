import { describe, expect, it } from 'bun:test';
import { Schema } from 'effect';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Leistungsart } from '#/shared/noten/notenwert.ts';
import { FachAktualisierung, FachEingabe } from './fach-schema.ts';

const eingabeMitGesammelterArt = (kind: Leistungsart) => ({
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

describe('Fach-Eingabegrenzen', () => {
  for (const kind of ['klausur', 'gfs', 'muendlich', 'sonstige'] as const) {
    it(`lassen gesammelt für ${kind} weder beim Anlegen noch beim Ändern zur Persistenz durch`, () => {
      const eingabe = eingabeMitGesammelterArt(kind);

      expect(Schema.decodeUnknownEither(FachEingabe)(eingabe)._tag).toBe(
        'Left',
      );
      expect(
        Schema.decodeUnknownEither(FachAktualisierung)({
          ...eingabe,
          id: 'mathematik',
        })._tag,
      ).toBe('Left');
    });
  }
});
