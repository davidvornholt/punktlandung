import { describe, expect, it } from 'bun:test';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { TrendEntry } from '../services/trend-calculation.ts';
import {
  heroCaption,
  heroDots,
  heroFigureLabel,
  heroLegend,
  heroValueText,
  monthText,
} from './hero-model.ts';

const halbjahre = [
  { id: 'h8-2', label: '8.2', startsOn: '2024-02-01' },
  { id: 'h9-1', label: '9.1', startsOn: '2024-09-09' },
  { id: 'h9-2', label: '9.2', startsOn: '2025-02-01' },
  { id: 'h10-1', label: '10.1', startsOn: '2025-09-15' },
  { id: 'h10-2', label: '10.2', startsOn: '2026-02-01' },
  { id: 'hj1-1', label: 'J1.1', startsOn: '2026-09-14' },
  { id: 'hj1-2', label: 'J1.2', startsOn: '2027-02-01' },
] as const;

const entry = (overrides: Partial<TrendEntry>): TrendEntry => ({
  id: 'n1',
  datum: '2026-10-12',
  punkte: 11,
  schnitt: 10.7,
  fachSnapshotId: '2026/27:deutsch',
  individualGewichtung: 1,
  fachGewichtung: standardgewichtung,
  fachId: 'deutsch',
  fachKuerzel: 'D',
  fachName: 'Deutsch',
  notenwert: 11,
  notensystem: 'punkte',
  leistungsart: 'klausur',
  halbjahrId: 'hj1-1',
  klassenstufe: 'J1',
  half: 1,
  ...overrides,
});

const old = (halbjahrId: string, id: string): TrendEntry =>
  entry({
    id,
    datum: '2024-10-07',
    punkte: 9.5,
    schnitt: 9.5,
    notenwert: 2.5,
    notensystem: 'sechser',
    halbjahrId,
    klassenstufe: '9',
    half: 1,
  });

const entries = [
  old('h8-2', 'a'),
  old('h9-1', 'b'),
  old('h9-2', 'c'),
  old('h10-1', 'd'),
  old('h10-2', 'e'),
  entry({ id: 'f' }),
  entry({ id: 'g', leistungsart: 'muendlich', fachId: 'mathe' }),
];

describe('heroDots', () => {
  it('färbt nach dem Abstand zum laufenden Halbjahr', () => {
    expect(
      heroDots(entries, halbjahre, 'hj1-1').map((dot) => dot.stratum),
    ).toEqual(['0', '0', '1', '2', '3', 'now', 'now']);
  });

  it('zeichnet nur mündliche Noten des laufenden Halbjahrs als Ring', () => {
    const dots = heroDots(
      [...entries, entry({ ...old('h10-2', 'h'), leistungsart: 'muendlich' })],
      halbjahre,
      'hj1-1',
    );
    expect(dots.filter((dot) => dot.ring).map((dot) => dot.id)).toEqual(['g']);
  });

  it('nimmt ohne laufendes Halbjahr das jüngste', () => {
    const dots = heroDots(entries, halbjahre.slice(0, 5), null);
    expect(dots.map((dot) => dot.stratum).slice(0, 5)).toEqual([
      '0',
      '1',
      '2',
      '3',
      'now',
    ]);
  });

  it('nennt im Tooltip Fach, Art, Datum und Note', () => {
    const [first] = heroDots(entries, halbjahre, 'hj1-1');
    expect(first?.tip).toBe(
      'Deutsch · Klausur · 07.10.2024 · Note 2,5 (9,5 P.)',
    );
    expect(heroDots(entries, halbjahre, 'hj1-1').at(-2)?.tip).toBe(
      'Deutsch · Klausur · 12.10.2026 · 11 P.',
    );
  });
});

describe('heroLegend', () => {
  it('nennt jede Farbe einmal und fasst die ältesten zusammen', () => {
    expect(
      heroLegend(entries, halbjahre, 'hj1-1').map((item) => item.label),
    ).toEqual(['bis 9.1', '9.2', '10.1', '10.2', 'J1.1', 'mündlich']);
  });

  it('lässt Halbjahre ohne Noten und den Ring ohne mündliche Note weg', () => {
    const legend = heroLegend(
      [old('h10-2', 'e'), entry({ id: 'f' })],
      halbjahre,
      'hj1-1',
    );
    expect(legend.map((item) => item.label)).toEqual(['10.2', 'J1.1']);
    expect(legend.map((item) => item.stratum)).toEqual(['3', 'now']);
  });
});

describe('heroCaption', () => {
  it('beschreibt heute alle Noten', () => {
    expect(heroCaption(entries, entries.length)).toEqual({
      title: 'Gesamtschnitt',
      text: 'Alle 7 Noten seit Klasse 9. Jedes Fach zählt in jedem Schuljahr gleich viel: Je weniger Noten es dort hat, desto schwerer wiegt jede.',
      landed: null,
    });
  });

  it('beschreibt einen früheren Stand mit der zuletzt gelandeten Note', () => {
    expect(heroCaption(entries, 2)).toEqual({
      title: 'Stand am 07.10.2024',
      text: 'Nach 2\u00a0Noten, in 9.1.',
      landed: 'Zuletzt gelandet: Deutsch, Klausur, Note\u00a02,5.',
    });
    expect(heroCaption(entries, 1).text).toBe('Nach einer Note, in 9.1.');
  });

  it('beschreibt die leere Skala', () => {
    expect(heroCaption(entries, 0)).toEqual({
      title: 'Vor der ersten Note',
      text: 'Die Skala ist leer.',
      landed: null,
    });
    expect(heroCaption([], 0).title).toBe('Vor der ersten Note');
  });
});

describe('heroValueText und heroFigureLabel', () => {
  it('sagen Tag, Anzahl und Schnitt', () => {
    expect(heroValueText(entries, entries.length)).toBe(
      'Heute: 7 Noten, Gesamtschnitt 10,7 P. Zuletzt: Deutsch, Mündlich, 11 P.',
    );
    expect(heroValueText(entries, 3)).toBe(
      '07.10.2024: 3 Noten, Gesamtschnitt 9,5 P. Zuletzt: Deutsch, Klausur, Note 2,5.',
    );
    expect(heroValueText(entries, 0)).toBe('Vor der ersten Note');
    expect(heroFigureLabel(entries, entries.length)).toBe(
      'Alle 7 Noten als Punkte auf der Skala von 0 bis 15 Notenpunkten. Der Gesamtschnitt liegt bei 10,7 P.',
    );
    expect(heroFigureLabel(entries, 3)).toBe(
      'Stand am 07.10.2024: 3 Noten als Punkte auf der Skala von 0 bis 15 Notenpunkten. Der Gesamtschnitt lag bei 9,5 P.',
    );
  });

  it('kommen ohne Gesamtschnitt aus', () => {
    const open = [entry({ schnitt: null })];
    expect(heroValueText(open, 1)).toContain('noch kein Gesamtschnitt');
    expect(heroFigureLabel(open, 1)).toBe(
      'Eine Note als Punkte auf der Skala von 0 bis 15 Notenpunkten.',
    );
  });
});

describe('monthText', () => {
  it('nennt Monat und Jahr', () => {
    expect(monthText('2024-10-07')).toBe('Oktober 2024');
  });
});
