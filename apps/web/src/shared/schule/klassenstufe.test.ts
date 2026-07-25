import { describe, expect, it } from 'bun:test';

import {
  halbjahrBezeichnung,
  istKlassenstufe,
  klassenstufen,
  naechsteKlassenstufe,
  notensystemFuerKlassenstufe,
} from './klassenstufe.ts';

describe('notensystemFuerKlassenstufe', () => {
  it('nutzt Noten 1–6 bis einschließlich Klasse 10', () => {
    for (const stufe of ['5', '10'] as const) {
      expect(notensystemFuerKlassenstufe(stufe)).toBe('sechser');
    }
  });

  it('nutzt Notenpunkte in der Kursstufe', () => {
    for (const stufe of ['J1', 'J2'] as const) {
      expect(notensystemFuerKlassenstufe(stufe)).toBe('punkte');
    }
  });
});

describe('halbjahrBezeichnung', () => {
  it('setzt Klassenstufe und Halbjahr zusammen', () => {
    expect(halbjahrBezeichnung({ klassenstufe: '10', half: 2 })).toBe('10.2');
    expect(halbjahrBezeichnung({ klassenstufe: 'J1', half: 1 })).toBe('J1.1');
  });

  it('ist über alle Stufen und Halbjahre eindeutig', () => {
    const bezeichnungen = klassenstufen.flatMap((klassenstufe) =>
      ([1, 2] as const).map((half) =>
        halbjahrBezeichnung({ klassenstufe, half }),
      ),
    );

    expect(new Set(bezeichnungen).size).toBe(bezeichnungen.length);
  });
});

describe('naechsteKlassenstufe', () => {
  it('führt von der Mittelstufe in die Kursstufe', () => {
    expect(naechsteKlassenstufe('10')).toBe('J1');
  });

  it('endet nach J2', () => {
    expect(naechsteKlassenstufe('J2')).toBeNull();
  });
});

describe('istKlassenstufe', () => {
  it('lehnt Klassenbezeichnungen und Altnamen ab', () => {
    expect(istKlassenstufe('9b')).toBe(false);
    expect(istKlassenstufe('K1')).toBe(false);
    expect(istKlassenstufe('10')).toBe(true);
  });
});
