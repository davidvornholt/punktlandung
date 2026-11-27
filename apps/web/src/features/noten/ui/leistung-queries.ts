import { hashKey, type QueryClient, queryOptions } from '@tanstack/react-query';

import type { QueryInvalidator } from '#/shared/query/query-invalidation.ts';
import { leistungKey } from '#/shared/query/query-keys.ts';
import type { Leistung, LeistungDetail } from '../services/noten-service.ts';
import { isNotFound } from './leistung-model.ts';
import type { LeistungOperations } from './leistung-operations.ts';

/**
 * The Leistung of a page with its Halbjahr, or `null` when there is no such
 * Leistung. That it does not exist is an answer and not a failure: asking
 * again does not change it, so it is not asked again the way a lost
 * connection is. Everything that reads the Leistung of a page uses these
 * options, so the answer in the cache has one shape.
 */
export const leistungQueryOptions = (
  operations: LeistungOperations,
  id: string,
) =>
  queryOptions({
    queryFn: async (): Promise<LeistungDetail | null> => {
      try {
        return await operations.load(id);
      } catch (error) {
        if (isNotFound(error)) {
          return null;
        }
        throw error;
      }
    },
    queryKey: leistungKey(id),
  });

/**
 * Stands in for the query client when a Leistung was deleted: everything a
 * written Note makes stale is loaded again, except the page of the Leistung
 * itself. It is gone, and asking for it again would only report that on the
 * page that is about to be left.
 */
export const withoutLeistung = (
  queryClient: QueryClient,
  id: string,
): QueryInvalidator => {
  const own = hashKey(leistungKey(id));
  return {
    invalidateQueries: ({ queryKey }) =>
      queryClient.invalidateQueries({
        queryKey,
        predicate: (query) => query.queryHash !== own,
      }),
  };
};

/**
 * The other Leistungen of the Fach are one step away on the page of a
 * Leistung: their discs and rows are links. What the list of the Halbjahr
 * knows about them is enough to show their pages at once, so each is put
 * down as that page's first answer, as old as the list it came from. The
 * page then loads its own. A page that has an answer keeps it.
 */
export const seedLeistungPages = (
  queryClient: QueryClient,
  {
    halbjahr,
    leistungen,
    updatedAt,
  }: {
    readonly halbjahr: LeistungDetail['halbjahr'];
    readonly leistungen: ReadonlyArray<Leistung>;
    /** When the list was loaded, in milliseconds. */
    readonly updatedAt: number;
  },
): void => {
  for (const leistung of leistungen) {
    const key = leistungKey(leistung.id);
    if (queryClient.getQueryState(key) === undefined) {
      queryClient.setQueryData<LeistungDetail>(
        key,
        { halbjahr, leistung },
        { updatedAt },
      );
    }
  }
};
