import { describe, expect, it } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { leistungKey, notenKey } from '#/shared/query/query-keys.ts';
import type { Leistung, LeistungDetail } from '../services/noten-service.ts';
import {
  leistungQueryOptions,
  seedLeistungPages,
  withoutLeistung,
} from './leistung-queries.ts';
import { invalidateNotenQueries } from './noten-invalidation.ts';

const halbjahr = {
  id: 'hj-1',
  system: 'punkte',
  startsOn: '2026-09-01',
  endsOn: '2027-01-31',
  schoolYear: '2026/27',
  label: 'J1.1',
} as const;

const leistung = (id: string, wert: number): Leistung => ({
  id,
  kind: 'klausur',
  gewicht: 1,
  datum: '2026-10-01',
  notiz: null,
  fachId: 'physik',
  fachName: 'Physik',
  fachKuerzel: 'Ph',
  gewichtung: standardgewichtung,
  status: 'graded',
  wert,
});

const listLoadedAt = 1000;

describe('leistungQueryOptions', () => {
  const load = (operations: { readonly load: () => Promise<LeistungDetail> }) =>
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }).fetchQuery(leistungQueryOptions(operations, 'a'));

  it('gibt die Leistung mit ihrem Halbjahr zurück', async () => {
    const detail = { halbjahr, leistung: leistung('a', 11) };
    expect(await load({ load: () => Promise.resolve(detail) })).toBe(detail);
  });

  it('antwortet mit null, wenn es die Leistung nicht gibt', async () => {
    const gone = Object.assign(new Error('Diese Leistung gibt es nicht.'), {
      _tag: 'NoteNichtGefunden',
    });
    expect(await load({ load: () => Promise.reject(gone) })).toBeNull();
  });

  it('scheitert, wenn die Leistung nicht geladen werden konnte', async () => {
    const lost = new Error('Verbindung unterbrochen');
    await expect(load({ load: () => Promise.reject(lost) })).rejects.toBe(lost);
  });
});

describe('withoutLeistung', () => {
  it('entwertet nach dem Löschen alles außer der Seite der gelöschten Leistung', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(leistungKey('a'), 'gelöscht');
    queryClient.setQueryData(leistungKey('b'), 'bleibt');
    queryClient.setQueryData(notenKey('hj-1'), []);

    await invalidateNotenQueries(withoutLeistung(queryClient, 'a'), 'hj-1');

    const invalidated = (key: ReadonlyArray<string>) =>
      queryClient.getQueryState(key)?.isInvalidated;
    expect(invalidated(leistungKey('a'))).toBe(false);
    expect(invalidated(leistungKey('b'))).toBe(true);
    expect(invalidated(notenKey('hj-1'))).toBe(true);
  });
});

describe('seedLeistungPages', () => {
  it('legt für jede Leistung ohne Antwort die der Liste hin, so alt wie die Liste', () => {
    const queryClient = new QueryClient();
    const other = leistung('b', 11);

    seedLeistungPages(queryClient, {
      halbjahr,
      leistungen: [other],
      updatedAt: listLoadedAt,
    });

    expect(queryClient.getQueryData<LeistungDetail>(leistungKey('b'))).toEqual({
      halbjahr,
      leistung: other,
    });
    expect(queryClient.getQueryState(leistungKey('b'))?.dataUpdatedAt).toBe(
      listLoadedAt,
    );
  });

  it('lässt eine Seite stehen, die ihre eigene Antwort schon hat', () => {
    const queryClient = new QueryClient();
    const own = { halbjahr, leistung: leistung('b', 14) };
    queryClient.setQueryData(leistungKey('b'), own);

    seedLeistungPages(queryClient, {
      halbjahr,
      leistungen: [leistung('b', 11)],
      updatedAt: listLoadedAt,
    });

    expect(queryClient.getQueryData<LeistungDetail>(leistungKey('b'))).toBe(
      own,
    );
  });
});
