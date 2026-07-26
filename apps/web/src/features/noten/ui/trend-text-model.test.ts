import { describe, expect, it } from 'bun:test';

import { createTrendTextModel } from './trend-text-model.ts';

describe('createTrendTextModel', () => {
  it('erhält jeden datierten Einzelwert und laufenden Schnitt', () => {
    const model = createTrendTextModel([
      {
        datum: '2026-09-14',
        fachKuerzel: 'M',
        punkte: 7,
        schnitt: 7,
      },
      {
        datum: '2026-10-02',
        fachKuerzel: 'D',
        punkte: 13,
        schnitt: 10,
      },
      {
        datum: '2026-11-20',
        fachKuerzel: 'M',
        punkte: 11,
        schnitt: 10.33,
      },
    ]);

    expect(model.rows).toEqual([
      {
        id: '0-2026-09-14-M',
        date: '14.09.2026',
        fach: 'M',
        notenpunkte: '7 P.',
        average: '7 P.',
      },
      {
        id: '1-2026-10-02-D',
        date: '02.10.2026',
        fach: 'D',
        notenpunkte: '13 P.',
        average: '10 P.',
      },
      {
        id: '2-2026-11-20-M',
        date: '20.11.2026',
        fach: 'M',
        notenpunkte: '11 P.',
        average: '10,33 P.',
      },
    ]);
    expect(model.summary).toContain('gestiegen');
    expect(model.summary).toContain('Niedrigster Einzelwert: 7 P.');
    expect(model.summary).toContain('höchster Einzelwert: 13 P.');
  });
});
