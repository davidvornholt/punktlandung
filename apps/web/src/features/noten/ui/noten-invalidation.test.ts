import { describe, expect, it, mock } from 'bun:test';

import { invalidateNotenQueries, notenQueries } from './noten-invalidation.ts';

describe('notenQueries', () => {
  it('umfasst Notenliste, Verlauf und Zeugnisvorschau des Halbjahrs', () => {
    expect(notenQueries('hj-1')).toEqual([
      ['noten', 'hj-1'],
      ['trend'],
      ['zeugnis', 'hj-1'],
    ]);
  });
});

describe('invalidateNotenQueries', () => {
  it('entwertet jede betroffene Abfrage genau einmal', async () => {
    const invalidateQueries = mock(
      (_selection: { readonly queryKey: ReadonlyArray<string> }) =>
        Promise.resolve(),
    );

    await invalidateNotenQueries({ invalidateQueries }, 'hj-1');

    expect(
      invalidateQueries.mock.calls.map(([selection]) => selection.queryKey),
    ).toEqual([['noten', 'hj-1'], ['trend'], ['zeugnis', 'hj-1']]);
  });
});
