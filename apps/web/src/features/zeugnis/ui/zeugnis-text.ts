/**
 * „Latein (archiviert)": dieselbe Markierung wie in der Fachauswahl einer
 * Note, damit ein Fach, das die Fächerliste nicht mehr zeigt, erklärt bleibt.
 */
export const fachLabel = (row: {
  readonly fachName: string;
  readonly archived: boolean;
}): string => (row.archived ? `${row.fachName} (archiviert)` : row.fachName);
