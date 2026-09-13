import { describe, expect, it } from 'bun:test';

import type { UpcomingLeistung } from '../services/upcoming-calculation.ts';
import {
  fachschnittText,
  overdueHeading,
  tageBisText,
  terminText,
  upcomingLabel,
} from './upcoming-text.ts';

const leistung = (
  overrides: Partial<UpcomingLeistung> = {},
): UpcomingLeistung => ({
  id: 'k1',
  kind: 'klausur',
  datum: '2026-09-19',
  tageBis: 6,
  fachId: 'mathe',
  fachName: 'Mathematik',
  fachKuerzel: 'M',
  fachschnitt: 11,
  topics: null,
  lernen: { daysAgo: null, inLastWeek: 0 },
  system: 'punkte',
  termId: 'hj-1',
  halbjahrLabel: 'J1.1',
  ...overrides,
});

describe('tageBisText', () => {
  it('nennt nahe Tage beim Namen und zählt sonst', () => {
    expect(tageBisText(0)).toBe('heute');
    expect(tageBisText(1)).toBe('morgen');
    expect(tageBisText(6)).toBe('in 6 Tagen');
    expect(tageBisText(-1)).toBe('gestern');
    expect(tageBisText(-10)).toBe('vor 10 Tagen');
  });
});

describe('Texte einer ausstehenden Leistung', () => {
  it('setzt Art, Datum und Abstand zu einer Zeile zusammen', () => {
    expect(terminText(leistung())).toBe('Klausur · 19.09.2026 · in 6 Tagen');
  });

  it('zeigt den Fachschnitt im System des Halbjahrs oder sagt, dass er fehlt', () => {
    expect(fachschnittText(leistung())).toBe('Schnitt 11 P.');
    expect(
      fachschnittText(leistung({ system: 'sechser', fachschnitt: 2.25 })),
    ).toBe('Schnitt 2,25');
    expect(fachschnittText(leistung({ fachschnitt: null }))).toBe(
      'noch kein Schnitt',
    );
  });

  it('benennt die Leistung eindeutig für Verweise', () => {
    expect(upcomingLabel(leistung())).toBe('Klausur Mathematik am 19.09.2026');
  });

  it('beugt die Nachfrage nach fehlenden Noten', () => {
    expect(overdueHeading(1)).toBe('Eine Note fehlt noch');
    expect(overdueHeading(3)).toBe('3 Noten fehlen noch');
  });
});
