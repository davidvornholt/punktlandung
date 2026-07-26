import { formatNote } from '#/shared/noten/zeugnisnote.ts';
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

const longDate = (iso: string): string => {
  const [year, month, tag] = iso.split('-');
  return `${tag}.${month}.${year}`;
};

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
  const notenpunkte = entries.map((entry) => entry.notenpunkte);
  let direction = 'gleich geblieben';
  if (last.average > first.average) {
    direction = 'gestiegen';
  } else if (last.average < first.average) {
    direction = 'gesunken';
  }
  return {
    rows: entries.map((entry, index) => ({
      id: `${index}-${entry.date}-${entry.fachShortName}`,
      date: longDate(entry.date),
      fach: entry.fachShortName,
      notenpunkte: formatNote(entry.notenpunkte, 'punkte'),
      average: formatNote(entry.average, 'punkte'),
    })),
    summary: `Der laufende Schnitt ist ${direction}. Niedrigster Einzelwert: ${formatNote(Math.min(...notenpunkte), 'punkte')}; höchster Einzelwert: ${formatNote(Math.max(...notenpunkte), 'punkte')}; aktueller Schnitt: ${formatNote(last.average, 'punkte')}.`,
  };
};
