import { describe, expect, it } from 'bun:test';

import type { Fach } from '../services/fach-service.ts';
import { fachFormValues } from './fach-form-model.ts';

const fach = (id: string, base: number): Fach => ({
  id,
  name: `Fach ${id}`,
  shortName: id,
  schriftlichShare: base,
  klausurGewichtung: base + 1,
  testGewichtung: base + 2,
  muendlichGewichtung: base + 3,
  gfsGewichtung: base + 4,
  sonstigeGewichtung: base + 5,
  sortOrder: base,
});

describe('fachFormWerte', () => {
  it('wechselt beim Zielwechsel sämtliche editierbaren Werte', () => {
    const valuesA = fachFormValues(fach('A', 10));
    const valuesB = fachFormValues(fach('B', 20));

    for (const field of Object.keys(valuesA) as ReadonlyArray<
      keyof typeof valuesA
    >) {
      expect(valuesB[field]).not.toBe(valuesA[field]);
    }
  });
});
