import { describe, expect, it } from 'bun:test';

import type { UpcomingLeistung } from '../services/upcoming-calculation.ts';
import { sinceText, whenText } from './upcoming-text.ts';

const leistung = (
  overrides: Partial<UpcomingLeistung> = {},
): UpcomingLeistung => ({
  id: 'k1',
  kind: 'klausur',
  datum: '2026-09-19',
  notiz: null,
  tageBis: 6,
  anteil: 1 / 3,
  fachId: 'mathe',
  fachName: 'Mathematik',
  fachKuerzel: 'M',
  fachschnitt: 11,
  system: 'punkte',
  termId: 'hj-1',
  halbjahrLabel: 'J1.1',
  ...overrides,
});

const overdue = leistung({ datum: '2026-09-03', tageBis: -10 });

describe('Texte einer ausstehenden Leistung', () => {
  it('nennt Wochentag, Datum und den Anteil am Fachschnitt', () => {
    expect(whenText(leistung())).toBe('Sa 19.09. · zählt 33 %');
  });

  it('sagt, seit wann eine Note fehlt', () => {
    expect(sinceText(overdue)).toBe('seit 10 Tagen');
    expect(sinceText(leistung({ tageBis: -1 }))).toBe('seit gestern');
  });
});
