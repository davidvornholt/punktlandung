import { describe, expect, it } from 'bun:test';

import { byDringlichkeit, dringlichkeit } from './dringlichkeit.ts';

describe('dringlichkeit', () => {
  it('eine Klausur in zehn Tagen und ein kleiner Test morgen stehen etwa gleich', () => {
    const klausur = dringlichkeit({ anteil: 0.3, tageBis: 10 });
    const test = dringlichkeit({ anteil: 0.05, tageBis: 1 });
    expect(klausur).toBeCloseTo(0.3 / 11);
    expect(test).toBeCloseTo(0.05 / 2);
    expect(Math.abs(klausur - test)).toBeLessThan(0.01);
  });

  it('ein verstrichener Termin zählt wie heute', () => {
    expect(dringlichkeit({ anteil: 0.2, tageBis: -5 })).toBe(
      dringlichkeit({ anteil: 0.2, tageBis: 0 }),
    );
  });

  it('sortiert die dringendste zuerst und bei Gleichstand die frühere', () => {
    // 0,2 / (3 + 1) und 0,1 / (1 + 1) sind exakt gleich dringend.
    const sorted = [
      { id: 'spaet', anteil: 0.3, tageBis: 30 },
      { id: 'gleich-spaeter', anteil: 0.2, tageBis: 3 },
      { id: 'heute', anteil: 0.1, tageBis: 0 },
      { id: 'gleich-frueher', anteil: 0.1, tageBis: 1 },
    ].sort(byDringlichkeit);
    expect(sorted.map((entry) => entry.id)).toEqual([
      'heute',
      'gleich-frueher',
      'gleich-spaeter',
      'spaet',
    ]);
  });
});
