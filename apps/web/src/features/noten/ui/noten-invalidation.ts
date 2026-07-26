import { notenKey, trendKey, zeugnisKey } from '#/shared/query/query-keys.ts';

type QueryInvalidator = {
  readonly invalidateQueries: (options: {
    readonly queryKey: ReadonlyArray<string>;
  }) => Promise<unknown>;
};

/**
 * Was eine geschriebene Note veralten lässt: die Notenliste des Halbjahrs, der
 * Verlauf über alle Halbjahre und die Zeugnisvorschau des Halbjahrs. Jede
 * Notenmutation — eintragen, ändern, löschen — nutzt dieselbe Liste, damit
 * keine Ansicht mit einem Stand von vor der Änderung zurückbleibt.
 */
export const notenQueries = (
  halbjahrId: string,
): ReadonlyArray<ReadonlyArray<string>> => [
  notenKey(halbjahrId),
  trendKey,
  zeugnisKey(halbjahrId),
];

export const invalidateNotenQueries = (
  queryClient: QueryInvalidator,
  halbjahrId: string,
) =>
  Promise.all(
    notenQueries(halbjahrId).map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
