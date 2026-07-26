import { describe, expect, it, mock } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';

import { invalidateNotenQueries, notenQueries } from './noten-invalidation.ts';

describe('notenQueries', () => {
  it('umfasst Notenliste, Verlauf und jede Zeugnisvorschau', () => {
    expect(notenQueries('hj-1')).toEqual([
      ['noten', 'hj-1'],
      ['trend'],
      ['zeugnis'],
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
    ).toEqual([['noten', 'hj-1'], ['trend'], ['zeugnis']]);
  });

  /**
   * Die Zeugnisvorschau eines Halbjahrs enthält die Jahresvorschau aus den
   * Noten beider Halbjahre. Ein echter Abfragespeicher zeigt, dass das
   * Geschwisterhalbjahr wirklich getroffen wird — die Schlüsselliste allein
   * verrät nichts über die Präfixauflösung.
   */
  it('entwertet auch die Zeugnisvorschau des Geschwisterhalbjahrs', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['zeugnis', 'hj-1'], { jahresvorschau: [] });
    queryClient.setQueryData(['zeugnis', 'hj-2'], { jahresvorschau: [] });
    queryClient.setQueryData(['noten', 'hj-1'], []);
    queryClient.setQueryData(['noten', 'hj-2'], []);
    queryClient.setQueryData(['trend'], []);

    await invalidateNotenQueries(queryClient, 'hj-1');

    const isInvalidated = (queryKey: ReadonlyArray<string>) =>
      queryClient.getQueryState(queryKey)?.isInvalidated;
    expect(isInvalidated(['zeugnis', 'hj-1'])).toBe(true);
    expect(isInvalidated(['zeugnis', 'hj-2'])).toBe(true);
    expect(isInvalidated(['noten', 'hj-1'])).toBe(true);
    expect(isInvalidated(['trend'])).toBe(true);
  });

  /** Die Notenliste eines fremden Halbjahrs ändert eine Note nicht. */
  it('lässt die Notenliste des Geschwisterhalbjahrs gültig', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['noten', 'hj-2'], []);

    await invalidateNotenQueries(queryClient, 'hj-1');

    expect(queryClient.getQueryState(['noten', 'hj-2'])?.isInvalidated).toBe(
      false,
    );
  });
});
