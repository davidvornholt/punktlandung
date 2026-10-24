import { describe, expect, it } from 'bun:test';

import type { TrendEntry } from '../services/trend-calculation.ts';
import {
  createTrendPointText,
  createTrendTextModel,
} from './trend-text-model.ts';

const entry = (overrides: Partial<TrendEntry> = {}): TrendEntry => ({
  datum: '2026-09-14',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  punkte: 7,
  schnitt: 7,
  notenwert: 7,
  notensystem: 'punkte',
  leistungsart: 'klausur',
  klassenstufe: 'J1',
  half: 1,
  ...overrides,
});

describe('createTrendTextModel', () => {
  it('erhält jeden datierten Einzelwert und laufenden Schnitt', () => {
    const model = createTrendTextModel([
      entry(),
      entry({
        datum: '2026-10-02',
        fachKuerzel: 'D',
        punkte: 13,
        schnitt: 10,
        notenwert: 13,
      }),
      entry({
        datum: '2026-11-20',
        punkte: 11,
        schnitt: 10.33,
        notenwert: 11,
      }),
    ]);

    expect(
      model.rows.map(({ id, date, notenpunkte, average }) => ({
        id,
        date,
        notenpunkte,
        average,
      })),
    ).toEqual([
      {
        id: '0-2026-09-14-M',
        date: '14.09.2026',
        notenpunkte: '7 P.',
        average: '7 P.',
      },
      {
        id: '1-2026-10-02-D',
        date: '02.10.2026',
        notenpunkte: '13 P.',
        average: '10 P.',
      },
      {
        id: '2-2026-11-20-M',
        date: '20.11.2026',
        notenpunkte: '11 P.',
        average: '10,33 P.',
      },
    ]);
    expect(model.summary).toContain('gestiegen');
    expect(model.summary).toContain('Niedrigster Einzelwert: 7 P.');
    expect(model.summary).toContain('höchster Einzelwert: 13 P.');
  });
});

describe('createTrendTextModel ohne Schnitt', () => {
  it('zeigt einen Strich statt eines Schnitts und misst den Verlauf ab dem ersten Schnitt', () => {
    const model = createTrendTextModel([
      entry({ schnitt: null }),
      entry({ datum: '2026-10-02', punkte: 9, schnitt: 9, notenwert: 9 }),
      entry({ datum: '2026-11-20', punkte: 12, schnitt: 10, notenwert: 12 }),
    ]);

    expect(model.rows.map(({ average }) => average)).toEqual([
      '—',
      '9 P.',
      '10 P.',
    ]);
    expect(model.summary).toContain('gestiegen');
    expect(model.summary).toContain('aktueller Schnitt: 10 P.');
  });

  it('sagt, dass noch kein Schnitt feststeht', () => {
    const model = createTrendTextModel([entry({ schnitt: null })]);

    expect(model.summary).toStartWith(
      'Noch geht keine Note in einen Fachschnitt ein.',
    );
    expect(model.summary).toContain('aktueller Schnitt: —.');
    expect(model.summary).not.toContain('NaN');
  });
});

describe('createTrendPointText', () => {
  it('zeigt in einem Punkte-Halbjahr nur den Punktwert', () => {
    expect(createTrendPointText(entry({ punkte: 11, notenwert: 11 }))).toEqual({
      halbjahr: 'J1.1',
      leistungsart: 'Klausur',
      date: '14.09.2026',
      fach: 'Mathematik',
      note: '11 P.',
      notenpunkte: null,
    });
  });

  it('stellt der eingetragenen Sechsernote den Punktwert der Kurve zur Seite', () => {
    expect(
      createTrendPointText(
        entry({
          fachKuerzel: 'D',
          fachName: 'Deutsch',
          punkte: 11,
          notenwert: 2,
          notensystem: 'sechser',
          leistungsart: 'gfs',
          klassenstufe: '10',
          half: 2,
        }),
      ),
    ).toEqual({
      halbjahr: '10.2',
      leistungsart: 'GFS',
      date: '14.09.2026',
      fach: 'Deutsch',
      note: '2',
      notenpunkte: '11 P.',
    });
  });
});
