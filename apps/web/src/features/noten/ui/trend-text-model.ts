import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import type { TrendEntry } from '../services/trend-calculation.ts';

export type TrendTextRow = {
  readonly id: string;
  readonly date: string;
  readonly fach: string;
  readonly notenpunkte: string;
  readonly average: string;
};

export type TrendTextModel = {
  readonly rows: ReadonlyArray<TrendTextRow>;
  readonly summary: string;
};

export type TrendPointText = {
  /** Halbjahr, Leistungsart und Datum als Metazeile über der Note. */
  readonly meta: ReadonlyArray<string>;
  readonly fach: string;
  /** Die Note, wie sie eingetragen wurde. */
  readonly note: string;
  /** Der Punktwert der Kurve, sofern die Note nicht ohnehin so eingetragen ist. */
  readonly notenpunkte: string | null;
};

const longDate = (iso: string): string => {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
};

/**
 * Ein einzelner Kurvenpunkt für den Tooltip. Die Linie läuft über alle
 * Schuljahre, deshalb verortet das Halbjahr den Punkt. Und weil sie alles auf
 * Notenpunkte normalisiert, steht in sechser-Halbjahren zusätzlich der
 * Punktwert daneben, auf dem der Punkt tatsächlich sitzt.
 */
export const createTrendPointText = (entry: TrendEntry): TrendPointText => ({
  meta: [
    formatHalbjahrLabel(entry),
    leistungsartLabel[entry.leistungsart],
    longDate(entry.datum),
  ],
  fach: entry.fachName,
  note: formatNote(entry.notenwert, entry.notensystem),
  notenpunkte:
    entry.notensystem === 'punkte' ? null : formatNote(entry.punkte, 'punkte'),
});

export const createTrendTextModel = (
  entries: ReadonlyArray<TrendEntry>,
): TrendTextModel => {
  if (entries.length === 0) {
    return {
      rows: [],
      summary: 'Noch keine Noten für die Verlaufslinie.',
    };
  }
  const [first] = entries;
  const last = entries.at(-1) ?? first;
  const notenpunkte = entries.map((entry) => entry.punkte);
  let direction = 'gleich geblieben';
  if (last.schnitt > first.schnitt) {
    direction = 'gestiegen';
  } else if (last.schnitt < first.schnitt) {
    direction = 'gesunken';
  }
  return {
    rows: entries.map((entry, index) => ({
      id: `${index}-${entry.datum}-${entry.fachKuerzel}`,
      date: longDate(entry.datum),
      fach: entry.fachKuerzel,
      notenpunkte: formatNote(entry.punkte, 'punkte'),
      average: formatNote(entry.schnitt, 'punkte'),
    })),
    summary: `Der laufende Schnitt ist ${direction}. Niedrigster Einzelwert: ${formatNote(Math.min(...notenpunkte), 'punkte')}; höchster Einzelwert: ${formatNote(Math.max(...notenpunkte), 'punkte')}; aktueller Schnitt: ${formatNote(last.schnitt, 'punkte')}.`,
  };
};
