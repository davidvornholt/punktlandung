import { describe, expect, it } from 'bun:test';

import type { Halbjahr } from '../services/halbjahr-service.ts';
import { halbjahrFormWerte } from './halbjahr-form-modell.ts';

const erstes: Halbjahr = {
  id: 'A',
  label: '10.1',
  schoolYear: '2025/26',
  half: 1,
  system: 'sechser',
  startsOn: '2025-08-01',
  endsOn: '2026-01-31',
};
const zweites: Halbjahr = {
  id: 'B',
  label: 'K1.2',
  schoolYear: '2026/27',
  half: 2,
  system: 'punkte',
  startsOn: '2027-02-01',
  endsOn: '2027-07-31',
};

describe('halbjahrFormWerte', () => {
  it('wechselt beim Zielwechsel sämtliche editierbaren Werte', () => {
    const werteA = halbjahrFormWerte(erstes);
    const werteB = halbjahrFormWerte(zweites);

    for (const feld of Object.keys(werteA) as ReadonlyArray<
      keyof typeof werteA
    >) {
      expect(werteB[feld]).not.toBe(werteA[feld]);
    }
  });
});
