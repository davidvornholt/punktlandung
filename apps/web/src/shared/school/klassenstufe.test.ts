import { describe, expect, it } from 'bun:test';

import {
  formatHalbjahrLabel,
  isKlassenstufe,
  klassenstufen,
  nextKlassenstufe,
  notensystemForKlassenstufe,
} from './klassenstufe.ts';

describe('notensystemFuerKlassenstufe', () => {
  it('nutzt Noten 1–6 bis einschließlich Klasse 10', () => {
    for (const klassenstufe of ['5', '10'] as const) {
      expect(notensystemForKlassenstufe(klassenstufe)).toBe('sechser');
    }
  });

  it('nutzt Notenpunkte in der Kursstufe', () => {
    for (const klassenstufe of ['J1', 'J2'] as const) {
      expect(notensystemForKlassenstufe(klassenstufe)).toBe('punkte');
    }
  });
});

describe('formatHalbjahrLabel', () => {
  it('setzt Klassenstufe und Halbjahr zusammen', () => {
    expect(formatHalbjahrLabel({ klassenstufe: '10', number: 2 })).toBe('10.2');
    expect(formatHalbjahrLabel({ klassenstufe: 'J1', number: 1 })).toBe('J1.1');
  });

  it('ist über alle Stufen und Halbjahre eindeutig', () => {
    const labels = klassenstufen.flatMap((klassenstufe) =>
      ([1, 2] as const).map((number) =>
        formatHalbjahrLabel({ klassenstufe, number }),
      ),
    );

    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('naechsteKlassenstufe', () => {
  it('führt von der Mittelstufe in die Kursstufe', () => {
    expect(nextKlassenstufe('10')).toBe('J1');
  });

  it('endet nach J2', () => {
    expect(nextKlassenstufe('J2')).toBeNull();
  });
});

describe('istKlassenstufe', () => {
  it('lehnt Klassenbezeichnungen und Altnamen ab', () => {
    expect(isKlassenstufe('9b')).toBe(false);
    expect(isKlassenstufe('K1')).toBe(false);
    expect(isKlassenstufe('10')).toBe(true);
  });
});
