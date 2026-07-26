import { describe, expect, it } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';

import { fachQueries, invalidateFachQueries } from './fach-invalidation.ts';

describe('fachQueries', () => {
  it('umfasst Fächerliste, Notenlisten, Verlauf und Zeugnisvorschau', () => {
    expect(fachQueries('2026/27')).toEqual([
      ['faecher', '2026/27'],
      ['noten'],
      ['trend'],
      ['zeugnis'],
    ]);
  });
});

describe('invalidateFachQueries', () => {
  /**
   * Die Gewichtung eines Fachs geht in jeden Fachschnitt ein, die
   * Archivierung nimmt es aus der Zeugnisvorschau: beides muss über die
   * Halbjahre hinweg neu geladen werden, deren Kennungen die Fachverwaltung
   * nicht kennt.
   */
  it('entwertet die Ansichten aller Halbjahre, nicht nur die Fächerliste', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['faecher', '2026/27'], []);
    queryClient.setQueryData(['noten', 'hj-1'], []);
    queryClient.setQueryData(['noten', 'hj-2'], []);
    queryClient.setQueryData(['zeugnis', 'hj-1'], {});
    queryClient.setQueryData(['zeugnis', 'hj-2'], {});
    queryClient.setQueryData(['trend'], []);

    await invalidateFachQueries(queryClient, '2026/27');

    const isInvalidated = (queryKey: ReadonlyArray<string>) =>
      queryClient.getQueryState(queryKey)?.isInvalidated;
    expect(isInvalidated(['faecher', '2026/27'])).toBe(true);
    expect(isInvalidated(['noten', 'hj-1'])).toBe(true);
    expect(isInvalidated(['noten', 'hj-2'])).toBe(true);
    expect(isInvalidated(['zeugnis', 'hj-1'])).toBe(true);
    expect(isInvalidated(['zeugnis', 'hj-2'])).toBe(true);
    expect(isInvalidated(['trend'])).toBe(true);
  });

  /** Ein anderes Schuljahr behält seinen Fachstand. */
  it('lässt die Fächerliste eines anderen Schuljahrs gültig', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['faecher', '2025/26'], []);

    await invalidateFachQueries(queryClient, '2026/27');

    expect(
      queryClient.getQueryState(['faecher', '2025/26'])?.isInvalidated,
    ).toBe(false);
  });
});
