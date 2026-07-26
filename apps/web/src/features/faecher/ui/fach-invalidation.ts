import type { QueryInvalidator } from '#/shared/query/query-invalidation.ts';
import { invalidateAll } from '#/shared/query/query-invalidation.ts';
import {
  faecherKey,
  notenKeyPrefix,
  trendKey,
  zeugnisKeyPrefix,
} from '#/shared/query/query-keys.ts';

/**
 * Was ein geschriebenes Fach veralten lässt. Name, Kürzel und Gewichtung eines
 * Fachs gehen in jeden Fachschnitt ein, und die Archivierung nimmt ein Fach
 * aus der Zeugnisvorschau: eine Fachänderung verändert deshalb die Notenliste,
 * die Zeugnisvorschau und den Verlauf mit — nicht nur die Fächerliste selbst.
 *
 * Noten und Zeugnis trifft der Präfixschlüssel, weil die Fachverwaltung mit
 * dem Schuljahr arbeitet und die Kennungen seiner Halbjahre nicht kennt.
 */
export const fachQueries = (
  schoolYear: string,
): ReadonlyArray<ReadonlyArray<string>> => [
  faecherKey(schoolYear),
  notenKeyPrefix,
  trendKey,
  zeugnisKeyPrefix,
];

export const invalidateFachQueries = (
  queryClient: QueryInvalidator,
  schoolYear: string,
) => invalidateAll(queryClient, fachQueries(schoolYear));
