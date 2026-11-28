import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { TrendEntry } from '../services/trend-calculation.ts';
import { createTrendTextModel } from './trend-text-model.ts';

const entry = (overrides: Partial<TrendEntry> = {}): TrendEntry => ({
  id: 'm1',
  datum: '2026-09-14',
  fachId: 'mathematik',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  punkte: 7,
  schnitt: 7,
  fachSnapshotId: '2026/27:deutsch',
  individualGewichtung: 1,
  fachGewichtung: standardgewichtung,
  notenwert: 7,
  notensystem: 'punkte',
  leistungsart: 'klausur',
  halbjahrId: 'j11',
  klassenstufe: 'J1',
  half: 1,
  ...overrides,
});

describe('createTrendTextModel', () => {
  it('erhält jeden datierten Einzelwert und laufenden Schnitt', () => {
    const model = createTrendTextModel([
      entry(),
      entry({
        id: 'd1',
        datum: '2026-10-02',
        fachKuerzel: 'D',
        punkte: 13,
        schnitt: 10,
        notenwert: 13,
      }),
      entry({
        id: 'm2',
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
        id: 'm1',
        date: '14.09.2026',
        notenpunkte: '7 P.',
        average: '7 P.',
      },
      {
        id: 'd1',
        date: '02.10.2026',
        notenpunkte: '13 P.',
        average: '10 P.',
      },
      {
        id: 'm2',
        date: '20.11.2026',
        notenpunkte: '11 P.',
        average: '10,33 P.',
      },
    ]);
    expect(model.summary).toContain('gestiegen');
    expect(model.summary).toContain(
      'Die niedrigste Note liegt bei 7\u00a0P., die höchste bei 13\u00a0P.',
    );
    // Der Punkt von „P.“ schließt den Satz.
    expect(model.summary).toEndWith(
      'der Gesamtschnitt heute bei 10,33\u00a0P.',
    );
  });

  it('verortet die Note im Halbjahr und stellt der Sechsernote ihren Punktwert zur Seite', () => {
    const [row] = createTrendTextModel([
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
    ]).rows;

    expect(row).toEqual({
      id: 'm1',
      halbjahr: '10.2',
      leistungsart: 'GFS',
      date: '14.09.2026',
      fach: 'Deutsch',
      note: '2',
      notenpunkte: '11 P.',
      average: '7 P.',
    });
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
    expect(model.summary).toEndWith('der Gesamtschnitt heute bei 10\u00a0P.');
  });

  it('sagt, dass noch kein Schnitt feststeht', () => {
    const model = createTrendTextModel([entry({ schnitt: null })]);

    expect(model.summary).toStartWith(
      'Noch geht keine Note in einen Fachschnitt ein.',
    );
    expect(model.summary).not.toContain('Gesamtschnitt heute');
    expect(model.summary).not.toContain('NaN');
  });
});
