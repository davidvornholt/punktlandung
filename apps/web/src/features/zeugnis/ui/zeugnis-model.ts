import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { RulerModel, RulerPoint } from '#/shared/ui/ruler/geometry.ts';
import type { Zeugnis, ZeugnisRow } from '../services/zeugnis-service.ts';
import { fachLabel } from './zeugnis-text.ts';

/** A Fach that has Noten, and so a Halbjahresnote: it lies on the figure. */
export type LandedRow = ZeugnisRow & {
  readonly schnitt: number;
  readonly halbjahresnote: number;
  readonly anzeige: string;
};

export const isLanded = (row: ZeugnisRow): row is LandedRow =>
  row.schnitt !== null && row.halbjahresnote !== null && row.anzeige !== null;

const disc = {
  /** A Kürzel may have ten letters; a disc has room for three. */
  letters: 3,
  orderDigits: 3,
} as const;

/** "Ph" stays, "Physik" becomes "Phy": what fits inside a disc. */
export const discText = (kuerzel: string): string =>
  kuerzel.length > disc.letters ? kuerzel.slice(0, disc.letters) : kuerzel;

/**
 * The Zeugnis as a figure: one disc per Fach on its Halbjahresnote. Every
 * Fach weighs the same, so the fulcrum under them is the mean of the
 * Halbjahresnoten. A disc comes from its unrounded Fachschnitt.
 */
export const zeugnisRuler = (zeugnis: Zeugnis): RulerModel => ({
  caption: 'Schnitt aller Halbjahresnoten',
  fulcrum: zeugnis.gesamtschnittWert,
  points: zeugnis.zeilen.filter(isLanded).map((row, index): RulerPoint => {
    const schnitt = formatNote(row.schnitt, zeugnis.system);
    const text = discText(row.fachKuerzel);
    return {
      id: row.fachId,
      value: row.halbjahresnote,
      origin: row.schnitt,
      mass: 1,
      kind: 'fach',
      state: 'graded',
      // Fächer have no date. They keep the order of the table.
      date: `${index}`.padStart(disc.orderDigits, '0'),
      text,
      // The name starts with what the disc prints, so a voice command that says it finds the link.
      label: `${text}, ${fachLabel(row)}: Halbjahresnote ${row.anzeige}, Fachschnitt ${schnitt}`,
      tip: `${fachLabel(row)} · Fachschnitt ${schnitt} · Halbjahresnote ${row.anzeige}`,
    };
  }),
});

/** Names the figure for screen readers, with the one number it is drawn for. */
export const figureLabel = (zeugnis: Zeugnis): string =>
  zeugnis.gesamtschnitt === null
    ? 'Halbjahresnoten auf der Skala'
    : `Halbjahresnoten auf der Skala. Schnitt aller Halbjahresnoten: ${zeugnis.gesamtschnitt}`;
