import { describe, expect, it } from 'bun:test';

import type { Fach } from '../services/fach-service.ts';
import { fachFormWerte } from './fach-form-modell.ts';

const fach = (id: string, basis: number): Fach => ({
  id,
  name: `Fach ${id}`,
  shortName: id,
  writtenShare: basis,
  klausurWeight: basis + 1,
  testWeight: basis + 2,
  muendlichWeight: basis + 3,
  gfsWeight: basis + 4,
  sonstigeWeight: basis + 5,
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
