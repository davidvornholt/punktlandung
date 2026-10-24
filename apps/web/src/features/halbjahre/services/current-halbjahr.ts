/**
 * Wählt das heute laufende Halbjahr aus einer nach Beginn absteigend
 * sortierten Liste; läuft keines, gilt das zuletzt begonnene.
 */
export const currentHalbjahr = <
  T extends { readonly startsOn: string; readonly endsOn: string },
>(
  halbjahre: ReadonlyArray<T>,
  today: string,
): T | null =>
  halbjahre.find(
    (halbjahr) => halbjahr.startsOn <= today && today <= halbjahr.endsOn,
  ) ??
  halbjahre.find((halbjahr) => halbjahr.startsOn <= today) ??
  null;

/**
 * Das Halbjahr, das Noten und Zeugnis ohne eigene Auswahl zeigen: das
 * aktuelle, und solange noch keines begonnen hat, das zuerst beginnende. So
 * lässt sich ein angelegtes künftiges Halbjahr schon vor seinem Beginn wählen
 * und mit geplanten Leistungen füllen. `null` nur ohne Halbjahre.
 */
export const defaultHalbjahr = <
  T extends { readonly startsOn: string; readonly endsOn: string },
>(
  halbjahre: ReadonlyArray<T>,
  today: string,
): T | null => currentHalbjahr(halbjahre, today) ?? halbjahre.at(-1) ?? null;
