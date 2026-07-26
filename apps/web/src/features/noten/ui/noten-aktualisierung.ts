import {
  notenSchluessel,
  verlaufSchluessel,
  zeugnisSchluessel,
} from '#/shared/query/abfrageschluessel.ts';

type Abfragespeicher = {
  readonly invalidateQueries: (auswahl: {
    readonly queryKey: ReadonlyArray<string>;
  }) => Promise<unknown>;
};

/**
 * Was eine geschriebene Note veralten lässt: die Notenliste des Halbjahrs, der
 * Verlauf über alle Halbjahre und die Zeugnisvorschau des Halbjahrs. Jede
 * Notenmutation — eintragen, ändern, löschen — nutzt dieselbe Liste, damit
 * keine Ansicht mit einem Stand von vor der Änderung zurückbleibt.
 */
export const notenAbfragen = (
  termId: string,
): ReadonlyArray<ReadonlyArray<string>> => [
  notenSchluessel(termId),
  verlaufSchluessel,
  zeugnisSchluessel(termId),
];

export const aktualisiereNotenAbfragen = (
  speicher: Abfragespeicher,
  termId: string,
) =>
  Promise.all(
    notenAbfragen(termId).map((queryKey) =>
      speicher.invalidateQueries({ queryKey }),
    ),
  );
