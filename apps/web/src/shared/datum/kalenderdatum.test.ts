import { describe, expect, it } from 'bun:test';

import { berlinKalenderdatum, formatiereIsoDatum } from './kalenderdatum.ts';

describe('berlinKalenderdatum', () => {
  it('wechselt den Tag an der Berliner Mitternacht statt an UTC', () => {
    expect(berlinKalenderdatum(new Date('2026-01-15T22:59:59Z'))).toBe(
      '2026-01-15',
    );
    expect(berlinKalenderdatum(new Date('2026-01-15T23:00:00Z'))).toBe(
      '2026-01-16',
    );
  });

  it('bleibt beim Wechsel auf Sommerzeit auf dem Berliner Kalendertag', () => {
    expect(berlinKalenderdatum(new Date('2026-03-29T00:30:00Z'))).toBe(
      '2026-03-29',
    );
    expect(berlinKalenderdatum(new Date('2026-03-29T01:30:00Z'))).toBe(
      '2026-03-29',
    );
    expect(berlinKalenderdatum(new Date('2026-03-29T22:30:00Z'))).toBe(
      '2026-03-30',
    );
  });

  it('ordnet beide Stunden beim Wechsel auf Winterzeit demselben Tag zu', () => {
    expect(berlinKalenderdatum(new Date('2026-10-25T00:30:00Z'))).toBe(
      '2026-10-25',
    );
    expect(berlinKalenderdatum(new Date('2026-10-25T01:30:00Z'))).toBe(
      '2026-10-25',
    );
  });
});

describe('formatiereIsoDatum', () => {
  it('dreht ein ISO-Datum in die deutsche Schreibweise', () => {
    expect(formatiereIsoDatum('2026-08-01')).toBe('01.08.2026');
  });

  it('gibt unvollständige Eingaben unverändert zurück', () => {
    expect(formatiereIsoDatum('')).toBe('');
    expect(formatiereIsoDatum('2026-08')).toBe('2026-08');
  });
});
