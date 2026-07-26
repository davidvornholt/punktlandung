/** Anzeigetext einer Notenanzahl, im Singular ausgeschrieben. */
export const notenAnzahlText = (anzahl: number) =>
  anzahl === 1 ? 'eine Note' : `${String(anzahl)} Noten`;
