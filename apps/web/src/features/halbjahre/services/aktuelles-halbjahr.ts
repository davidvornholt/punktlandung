/**
 * Wählt das heute laufende Halbjahr aus einer nach Beginn absteigend
 * sortierten Liste; läuft keines, gilt das zuletzt begonnene.
 */
export const aktuellesHalbjahr = <
  T extends { readonly startsOn: string; readonly endsOn: string },
>(
  halbjahre: ReadonlyArray<T>,
  heute: string,
): T | null =>
  halbjahre.find(
    (halbjahr) => halbjahr.startsOn <= heute && heute <= halbjahr.endsOn,
  ) ??
  halbjahre[0] ??
  null;
