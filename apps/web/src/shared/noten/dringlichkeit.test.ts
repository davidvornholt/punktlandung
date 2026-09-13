import { describe, expect, it } from 'bun:test';

import {
  byDringlichkeit,
  dringlichkeit,
  offenerAnteil,
} from './dringlichkeit.ts';

const ohneThemen: null = null;

describe('dringlichkeit', () => {
  it('eine Klausur in zehn Tagen und ein kleiner Test morgen stehen etwa gleich', () => {
    const klausur = dringlichkeit({
      anteil: 0.3,
      tageBis: 10,
      topics: ohneThemen,
    });
    const test = dringlichkeit({
      anteil: 0.05,
      tageBis: 1,
      topics: ohneThemen,
    });
    expect(klausur).toBeCloseTo(0.3 / 11);
    expect(test).toBeCloseTo(0.05 / 2);
    expect(Math.abs(klausur - test)).toBeLessThan(0.01);
  });

  it('ein verstrichener Termin zählt wie heute', () => {
    expect(
      dringlichkeit({ anteil: 0.2, tageBis: -5, topics: ohneThemen }),
    ).toBe(dringlichkeit({ anteil: 0.2, tageBis: 0, topics: ohneThemen }));
  });

  it('sichere Themen nehmen der Leistung Dringlichkeit, alle sicheren nehmen sie ganz', () => {
    const halb = dringlichkeit({
      anteil: 0.4,
      tageBis: 3,
      topics: { total: 4, checked: 2 },
    });
    expect(halb).toBeCloseTo(
      dringlichkeit({ anteil: 0.2, tageBis: 3, topics: ohneThemen }),
    );
    expect(
      dringlichkeit({
        anteil: 0.4,
        tageBis: 0,
        topics: { total: 4, checked: 4 },
      }),
    ).toBe(0);
  });

  it('sortiert die dringendste zuerst und bei Gleichstand die frühere', () => {
    // 0,2 / (3 + 1) und 0,1 / (1 + 1) sind exakt gleich dringend.
    const sorted = [
      { id: 'spaet', anteil: 0.3, tageBis: 30, topics: ohneThemen },
      { id: 'gleich-spaeter', anteil: 0.2, tageBis: 3, topics: ohneThemen },
      { id: 'heute', anteil: 0.1, tageBis: 0, topics: ohneThemen },
      { id: 'gleich-frueher', anteil: 0.1, tageBis: 1, topics: ohneThemen },
      {
        id: 'fertig',
        anteil: 0.9,
        tageBis: 0,
        topics: { total: 2, checked: 2 },
      },
    ].sort(byDringlichkeit);
    expect(sorted.map((entry) => entry.id)).toEqual([
      'heute',
      'gleich-frueher',
      'gleich-spaeter',
      'spaet',
      'fertig',
    ]);
  });
});

describe('offenerAnteil', () => {
  it('ist ohne Themenliste eins und sonst der Anteil der offenen Themen', () => {
    expect(offenerAnteil(null)).toBe(1);
    expect(offenerAnteil({ total: 0, checked: 0 })).toBe(1);
    expect(offenerAnteil({ total: 4, checked: 3 })).toBe(0.25);
  });
});
