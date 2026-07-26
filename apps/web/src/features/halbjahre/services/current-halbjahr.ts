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
