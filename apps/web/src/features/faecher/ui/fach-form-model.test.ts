import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fach } from '../services/fach-service.ts';
import { fachFormValues } from './fach-form-model.ts';

const fach = (id: string, base: number): Fach => ({
  id,
  name: `Fach ${id}`,
  shortName: id,
  gewichtung: {
    ...standardgewichtung,
    verhaeltnis: { schriftlich: base, muendlich: 1 },
  },
  sortOrder: base,
});

describe('fachFormValues', () => {
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
