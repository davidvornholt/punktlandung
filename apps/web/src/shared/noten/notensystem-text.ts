import type { Notensystem } from './notenwert.ts';

/** Anzeigetext der beiden Notensysteme. */
export const notensystemText = (system: Notensystem) =>
  system === 'punkte' ? 'Notenpunkte 0–15' : 'Noten 1–6';
