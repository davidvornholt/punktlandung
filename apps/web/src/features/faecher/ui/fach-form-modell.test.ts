import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fach } from '../services/fach-service.ts';
import { fachFormWerte } from './fach-form-modell.ts';

const fach = (id: string, basis: number): Fach => ({
  id,
  name: `Fach ${id}`,
  shortName: id,
  gewichtung: {
    ...standardgewichtung,
    verhaeltnis: { schriftlich: basis, muendlich: 1 },
  },
  sortOrder: basis,
});

describe('fachFormWerte', () => {
  it('wechselt beim Zielwechsel sämtliche editierbaren Werte', () => {
    const werteA = fachFormWerte(fach('A', 10));
    const werteB = fachFormWerte(fach('B', 20));

    for (const feld of Object.keys(werteA) as ReadonlyArray<
      keyof typeof werteA
    >) {
      expect(werteB[feld]).not.toBe(werteA[feld]);
    }
  });
});
