/** Anzeigetext einer Notenanzahl, im Singular ausgeschrieben. */
export const notenCountText = (count: number) =>
  count === 1 ? 'eine Note' : `${String(count)} Noten`;
