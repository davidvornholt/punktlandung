import type { Notensystem } from './notenwert.ts';

/** Anzeigetext der beiden Notensysteme. */
export const notensystemText = (notensystem: Notensystem) =>
  notensystem === 'punkte' ? 'Notenpunkte 0–15' : 'Noten 1–6';
