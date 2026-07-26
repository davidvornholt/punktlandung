import type { QueryInvalidator } from '#/shared/query/query-invalidation.ts';
import { invalidateAll } from '#/shared/query/query-invalidation.ts';
import {
  notenKey,
  trendKey,
  zeugnisKeyPrefix,
} from '#/shared/query/query-keys.ts';

/**
 * Was eine geschriebene Note veralten lässt: die Notenliste des Halbjahrs, der
 * Verlauf über alle Halbjahre und jede Zeugnisvorschau. Jede Notenmutation —
 * eintragen, ändern, löschen — nutzt dieselbe Liste, damit keine Ansicht mit
 * einem Stand von vor der Änderung zurückbleibt.
 *
 * Das Zeugnis trifft der Präfixschlüssel und nicht der des bearbeiteten
 * Halbjahrs: die Zeugnisvorschau jedes Halbjahrs enthält die Jahresvorschau,
 * die aus den Noten beider Halbjahre des Schuljahrs entsteht. Wer im Zeugnis
 * das Halbjahr wechselt, hätte sonst im Geschwisterhalbjahr weiter die
 * Jahresvorschau von vor der Änderung vor sich.
 */
export const notenQueries = (
  halbjahrId: string,
): ReadonlyArray<ReadonlyArray<string>> => [
  notenKey(halbjahrId),
  trendKey,
  zeugnisKeyPrefix,
];

export const invalidateNotenQueries = (
  queryClient: QueryInvalidator,
  halbjahrId: string,
) => invalidateAll(queryClient, notenQueries(halbjahrId));
