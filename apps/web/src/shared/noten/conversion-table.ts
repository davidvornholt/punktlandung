/**
 * Referenztabelle beider Notensysteme: jede Viertelnote von 1+ bis 6 mit ihrem
 * Punktewert. Sie rechnet nicht selbst, sondern liest `toNotenpunkte` ab, damit
 * die Umrechnung an genau einer Stelle steht.
 */

import { isNotentendenz, toNotenpunkte } from './notenwert.ts';
import { formatHalbnote, formatNote } from './zeugnisnote.ts';

export type ConversionRow = {
  readonly note: number;
  /** Nativer Dezimalwert, wie ihn die Übersicht zeigt. */
  readonly noteLabel: string;
  /** Derselbe Wert als Tendenz gesetzt: "1+", "1", "1-", "1-2". */
  readonly tendenzLabel: string;
  readonly notenpunkte: number;
  readonly notenpunkteLabel: string;
  /** Amtliche Tendenz statt eines von der App interpolierten Zwischenwerts. */
  readonly tendenz: boolean;
};

const bestNotenwert = 0.75;
const worstNotenwert = 6;
const quarterStep = 0.25;
const rowCount = (worstNotenwert - bestNotenwert) / quarterStep + 1;

export const conversionTable: ReadonlyArray<ConversionRow> = Array.from(
  { length: rowCount },
  (_unused, index) => {
    const note = bestNotenwert + index * quarterStep;
    const notenpunkte = toNotenpunkte(note, 'sechser');
    return {
      note,
      noteLabel: formatNote(note, 'sechser'),
      tendenzLabel: formatHalbnote(note),
      notenpunkte,
      notenpunkteLabel: formatNote(notenpunkte, 'punkte'),
      tendenz: isNotentendenz(note),
    };
  },
);
