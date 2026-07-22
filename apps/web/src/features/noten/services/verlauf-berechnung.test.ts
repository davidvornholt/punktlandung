import { describe, expect, it } from 'bun:test';

import { berechneVerlauf } from './verlauf-berechnung.ts';

describe('berechneVerlauf', () => {
  it('führt den gewichteten Schnitt laufend mit', () => {
    const verlauf = berechneVerlauf([
      { datum: '2026-09-20', punkte: 12, gewicht: 2, fachKuerzel: 'M' },
      { datum: '2026-10-05', punkte: 9, gewicht: 1, fachKuerzel: 'D' },
    ]);
    expect(verlauf).toEqual([
      { datum: '2026-09-20', punkte: 12, schnitt: 12, fachKuerzel: 'M' },
      { datum: '2026-10-05', punkte: 9, schnitt: 11, fachKuerzel: 'D' },
    ]);
  });

  it('liefert für keine Noten eine leere Liste', () => {
    expect(berechneVerlauf([])).toEqual([]);
  });
});
