import type { Notensystem } from '#/shared/noten/notenwert.ts';

/**
 * Klassenstufen eines baden-württembergischen Gymnasiums in aufsteigender
 * Reihenfolge. J1 und J2 sind die beiden Jahrgangsstufen der Kursstufe.
 */
export const klassenstufen = [
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J1',
  'J2',
] as const;

export type Klassenstufe = (typeof klassenstufen)[number];

export const isKlassenstufe = (value: string): value is Klassenstufe =>
  (klassenstufen as ReadonlyArray<string>).includes(value);

/** In der Kursstufe zählen Notenpunkte, davor Noten von 1 bis 6. */
export const notensystemForKlassenstufe = (
  klassenstufe: Klassenstufe,
): Notensystem =>
  klassenstufe === 'J1' || klassenstufe === 'J2' ? 'punkte' : 'sechser';

/** Anzeigename eines Halbjahrs, z. B. "10.2" oder "J1.1". */
export const formatHalbjahrLabel = (halbjahr: {
  readonly klassenstufe: Klassenstufe;
  readonly half: 1 | 2;
}): string => `${halbjahr.klassenstufe}.${halbjahr.half}`;

/** Die auf `klassenstufe` folgende Stufe; nach J2 endet die Schullaufbahn. */
export const nextKlassenstufe = (
  klassenstufe: Klassenstufe,
): Klassenstufe | null =>
  klassenstufen[klassenstufen.indexOf(klassenstufe) + 1] ?? null;

export const klassenstufeText = (klassenstufe: Klassenstufe): string =>
  klassenstufe === 'J1' || klassenstufe === 'J2'
    ? `Kursstufe ${klassenstufe}`
    : `Klasse ${klassenstufe}`;
