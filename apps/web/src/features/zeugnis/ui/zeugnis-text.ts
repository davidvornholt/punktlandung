import type { Notensystem } from '#/shared/noten/notenwert.ts';

/**
 * „Latein (archiviert)": dieselbe Markierung wie in der Fachauswahl einer
 * Note, damit ein Fach, das die Fächerliste nicht mehr zeigt, erklärt bleibt.
 */
export const fachLabel = (row: {
  readonly fachName: string;
  readonly archived: boolean;
}): string => (row.archived ? `${row.fachName} (archiviert)` : row.fachName);

const punkteUnit = ' P.';

/**
 * A Note as the Zeugnis prints it, taken apart into its figure and its unit,
 * so the figure can be set larger: "11 P." has the unit "P.", "2-3" has none.
 */
export const noteParts = (
  text: string,
): { readonly figure: string; readonly unit: string | null } =>
  text.endsWith(punkteUnit)
    ? { figure: text.slice(0, -punkteUnit.length), unit: punkteUnit.trim() }
    : { figure: text, unit: null };

/** What the figure and the magnifiers show, in the words of the Halbjahr's Notensystem. */
export const legendTexts = (system: Notensystem): ReadonlyArray<string> =>
  system === 'punkte'
    ? [
        'Im Zeugnis steht jedes Fach auf einem ganzen Notenpunkt und wiegt gleich viel.',
        'Der rote Punkt zeigt den Fachschnitt, der Pfeil die Rundung. Die gestrichelten Linien sind die Grenzen: ab ,5 wird aufgerundet.',
      ]
    : [
        'Im Halbjahr steht jedes Fach auf einer Viertelnote wie 2, 2-, 2-3 oder 3+ und wiegt gleich viel.',
        'Der rote Punkt zeigt den Fachschnitt, der Pfeil die Rundung. Die gestrichelten Linien sind die Grenzen: genau auf einer Grenze zählt die schlechtere Note.',
      ];
