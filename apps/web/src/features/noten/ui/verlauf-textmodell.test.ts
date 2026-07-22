import { describe, expect, it } from 'bun:test';

import { erstelleVerlaufTextmodell } from './verlauf-textmodell.ts';

describe('erstelleVerlaufTextmodell', () => {
  it('erhält jeden datierten Einzelwert und laufenden Schnitt', () => {
    const modell = erstelleVerlaufTextmodell([
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

    expect(modell.zeilen).toEqual([
      {
        kennung: '0-2026-09-14-M',
        datum: '14.09.2026',
        fach: 'M',
        punkte: '7 P.',
        schnitt: '7 P.',
      },
      {
        kennung: '1-2026-10-02-D',
        datum: '02.10.2026',
        fach: 'D',
        punkte: '13 P.',
        schnitt: '10 P.',
      },
      {
        kennung: '2-2026-11-20-M',
        datum: '20.11.2026',
        fach: 'M',
        punkte: '11 P.',
        schnitt: '10,33 P.',
      },
    ]);
    expect(modell.zusammenfassung).toContain('gestiegen');
    expect(modell.zusammenfassung).toContain('Niedrigster Einzelwert: 7 P.');
    expect(modell.zusammenfassung).toContain('höchster Einzelwert: 13 P.');
  });
});
