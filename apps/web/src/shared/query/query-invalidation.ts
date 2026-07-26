/**
 * Der Ausschnitt des Abfragespeichers, den eine Entwertung braucht. Als
 * eigener Typ statt `QueryClient`, damit die Entwertungslisten der Features
 * ohne React-Umgebung geprüft werden können.
 */
export type QueryInvalidator = {
  readonly invalidateQueries: (selection: {
    readonly queryKey: ReadonlyArray<string>;
  }) => Promise<unknown>;
};

/** Entwertet jeden Schlüssel der Liste genau einmal. */
export const invalidateAll = (
  queryClient: QueryInvalidator,
  queryKeys: ReadonlyArray<ReadonlyArray<string>>,
) =>
  Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
