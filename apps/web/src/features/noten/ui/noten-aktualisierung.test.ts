import { describe, expect, it, mock } from 'bun:test';

import {
  aktualisiereNotenAbfragen,
  notenAbfragen,
} from './noten-aktualisierung.ts';

describe('notenAbfragen', () => {
  it('umfasst Notenliste, Verlauf und Zeugnisvorschau des Halbjahrs', () => {
    expect(notenAbfragen('hj-1')).toEqual([
      ['noten', 'hj-1'],
      ['verlauf'],
      ['zeugnis', 'hj-1'],
    ]);
  });
});

describe('aktualisiereNotenAbfragen', () => {
  it('entwertet jede betroffene Abfrage genau einmal', async () => {
    const invalidateQueries = mock(
      (_auswahl: { readonly queryKey: ReadonlyArray<string> }) =>
        Promise.resolve(),
    );

    await aktualisiereNotenAbfragen({ invalidateQueries }, 'hj-1');

    expect(
      invalidateQueries.mock.calls.map(([auswahl]) => auswahl.queryKey),
    ).toEqual([['noten', 'hj-1'], ['verlauf'], ['zeugnis', 'hj-1']]);
  });
});
