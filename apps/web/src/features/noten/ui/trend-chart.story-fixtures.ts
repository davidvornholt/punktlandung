import type { TrendEntry } from '../services/trend-calculation.ts';

/** Eine Klausur und eine GFS der J1.1, eine Woche auseinander. */
export const trendEntries: ReadonlyArray<TrendEntry> = [
  {
    datum: '2026-09-14',
    fachKuerzel: 'M',
    fachName: 'Mathematik',
    punkte: 11,
    schnitt: 11,
    notenwert: 11,
    notensystem: 'punkte',
    leistungsart: 'klausur',
    klassenstufe: 'J1',
    half: 1,
  },
  {
    datum: '2026-09-21',
    fachKuerzel: 'D',
    fachName: 'Deutsch',
    punkte: 7,
    schnitt: 9,
    notenwert: 7,
    notensystem: 'punkte',
    leistungsart: 'gfs',
    klassenstufe: 'J1',
    half: 1,
  },
];
