import { describe, expect, it } from 'bun:test';

import type { Zeugnis, ZeugnisRow } from '../services/zeugnis-service.ts';
import { magnifier } from './rounding-magnifier-model.ts';
import {
  discText,
  figureLabel,
  isLanded,
  zeugnisRuler,
} from './zeugnis-model.ts';

const row = (
  fachId: string,
  schnitt: number | null,
  halbjahresnote: number | null,
  overrides: Partial<ZeugnisRow> = {},
): ZeugnisRow => ({
  fachId,
  fachName: fachId,
  fachKuerzel: fachId.slice(0, 2),
  archived: false,
  schnitt,
  halbjahresnote,
  anzeige: halbjahresnote === null ? null : `${halbjahresnote} P.`,
  anzahlNoten: schnitt === null ? 0 : 2,
  ...overrides,
});

const zeugnis: Zeugnis = {
  termId: 'j1-1',
  label: 'J1.1',
  schoolYear: '2026/27',
  system: 'punkte',
  gesamtschnitt: '11,33 P.',
  gesamtschnittWert: 34 / 3,
  zeilen: [
    row('Deutsch', 10.8, 11),
    row('Mathematik', 10.5, 11),
    row('Sport', null, null),
    row('Latein', 12.33, 12, { archived: true }),
  ],
  jahresvorschau: null,
};

describe('zeugnisRuler', () => {
  it('legt jedes Fach mit Noten auf seine Halbjahresnote', () => {
    const model = zeugnisRuler(zeugnis);
    expect(model.points.map((point) => [point.id, point.value])).toEqual([
      ['Deutsch', 11],
      ['Mathematik', 11],
      ['Latein', 12],
    ]);
    expect(model.points.every((point) => point.kind === 'fach')).toBe(true);
    expect(model.points.every((point) => point.mass === 1)).toBe(true);
  });

  it('stellt den Drehpunkt unter den Schnitt der Halbjahresnoten', () => {
    const model = zeugnisRuler(zeugnis);
    const values = model.points.map((point) => point.value ?? 0);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(model.fulcrum).toBeCloseTo(mean, 10);
    expect(model.caption).toBe('Schnitt aller Halbjahresnoten');
  });

  it('lässt jede Scheibe von ihrem ungerundeten Fachschnitt kommen', () => {
    const model = zeugnisRuler(zeugnis);
    expect(model.points.map((point) => point.origin)).toEqual([
      10.8, 10.5, 12.33,
    ]);
  });

  it('benennt die Scheibe mit ihrem Aufdruck, Fach, Halbjahresnote und Fachschnitt', () => {
    const [deutsch, , latein] = zeugnisRuler(zeugnis).points;
    expect(deutsch?.label).toBe(
      'De, Deutsch: Halbjahresnote 11 P., Fachschnitt 10,8 P.',
    );
    expect(deutsch?.text).toBe('De');
    expect(latein?.tip).toBe(
      'Latein (archiviert) · Fachschnitt 12,33 P. · Halbjahresnote 12 P.',
    );
  });

  it('hat ohne Noten keinen Drehpunkt', () => {
    const empty = zeugnisRuler({
      ...zeugnis,
      gesamtschnitt: null,
      gesamtschnittWert: null,
      zeilen: [row('Sport', null, null)],
    });
    expect(empty.fulcrum).toBeNull();
    expect(empty.points).toEqual([]);
  });
});

describe('isLanded', () => {
  it('trennt Fächer mit Halbjahresnote von Fächern ohne Noten', () => {
    expect(zeugnis.zeilen.map(isLanded)).toEqual([true, true, false, true]);
  });
});

describe('discText', () => {
  it('kürzt ein langes Kürzel auf das, was in eine Scheibe passt', () => {
    expect(discText('Ph')).toBe('Ph');
    expect(discText('Bio')).toBe('Bio');
    expect(discText('Physik')).toBe('Phy');
  });
});

describe('figureLabel', () => {
  it('nennt den Schnitt aller Halbjahresnoten', () => {
    expect(figureLabel(zeugnis)).toBe(
      'Halbjahresnoten auf der Skala. Schnitt aller Halbjahresnoten: 11,33 P.',
    );
    expect(figureLabel({ ...zeugnis, gesamtschnitt: null })).toBe(
      'Halbjahresnoten auf der Skala',
    );
  });
});

describe('magnifier', () => {
  const centre = 66;

  it('zeigt einen Schnitt unter der Halbjahresnote links der Marke', () => {
    const glass = magnifier({
      halbjahresnote: 11,
      narrow: false,
      schnitt: 10.5,
      system: 'punkte',
    });
    expect(glass.dot.x).toBe(centre - 31);
    expect(glass.arrow?.head.startsWith(`M${centre} `)).toBe(true);
    expect(glass.arrow?.line.startsWith(`M${centre - 31} `)).toBe(true);
  });

  it('zeigt einen Schnitt über der Halbjahresnote rechts der Marke', () => {
    const glass = magnifier({
      halbjahresnote: 12,
      narrow: false,
      schnitt: 12.33,
      system: 'punkte',
    });
    expect(glass.dot.x).toBeGreaterThan(centre);
  });

  it('legt im Sechsersystem die bessere Note nach rechts', () => {
    // 2,3 ist schlechter als 2,25 und liegt deshalb links der Marke.
    const worse = magnifier({
      halbjahresnote: 2.25,
      narrow: false,
      schnitt: 2.3,
      system: 'sechser',
    });
    const better = magnifier({
      halbjahresnote: 2.25,
      narrow: false,
      schnitt: 2.15,
      system: 'sechser',
    });
    expect(worse.dot.x).toBeLessThan(centre);
    expect(better.dot.x).toBeGreaterThan(centre);
  });

  it('zeichnet keinen Pfeil, wenn der Schnitt auf der Marke liegt', () => {
    const glass = magnifier({
      halbjahresnote: 12,
      narrow: false,
      schnitt: 12,
      system: 'punkte',
    });
    expect(glass.dot.x).toBe(centre);
    expect(glass.arrow).toBeNull();
  });

  it('zeichnet keinen Pfeil, dessen Spitze unter dem Punkt läge', () => {
    const glass = magnifier({
      halbjahresnote: 11,
      narrow: false,
      schnitt: 10.9,
      system: 'punkte',
    });
    expect(glass.dot.x).toBeLessThan(centre);
    expect(glass.arrow).toBeNull();
  });

  it('zeichnet eine kürzere Pfeilspitze, wenn der Punkt nah an der Marke liegt', () => {
    // 0,15 Notenpunkte neben der Marke: Platz für eine Spitze, aber nicht für die ganze.
    const near = magnifier({
      halbjahresnote: 11,
      narrow: false,
      schnitt: 10.85,
      system: 'punkte',
    });
    const far = magnifier({
      halbjahresnote: 11,
      narrow: false,
      schnitt: 10.6,
      system: 'punkte',
    });
    expect(far.arrow?.head).toBe(`M${centre} 7l-6 -3.2v6.4z`);
    expect(near.arrow?.head).toBe(`M${centre} 7l-5.7 -3v6.1z`);
  });

  it('hält den Punkt im Glas, wenn die Note am Ende der Skala begrenzt wurde', () => {
    const glass = magnifier({
      halbjahresnote: 1,
      narrow: true,
      schnitt: 0.25,
      system: 'sechser',
    });
    expect(glass.dot.x).toBeLessThanOrEqual(glass.width - glass.dot.r);
  });

  it('ist auf dem Telefon schmaler', () => {
    const wide = magnifier({
      halbjahresnote: 11,
      narrow: false,
      schnitt: 11,
      system: 'punkte',
    });
    const narrow = magnifier({
      halbjahresnote: 11,
      narrow: true,
      schnitt: 11,
      system: 'punkte',
    });
    expect(narrow.width).toBeLessThan(wide.width);
  });
});
