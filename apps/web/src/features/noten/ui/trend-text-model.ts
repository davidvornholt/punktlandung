import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import type { TrendEntry } from '../services/trend-calculation.ts';

export type TrendTextRow = {
  readonly id: string;
  readonly halbjahr: string;
  readonly leistungsart: string;
  readonly date: string;
  readonly fach: string;
  readonly note: string;
  readonly notenpunkte: string;
  readonly average: string;
};

export type TrendTextModel = {
  readonly rows: ReadonlyArray<TrendTextRow>;
  readonly summary: string;
};

export type TrendPointText = {
  readonly halbjahr: string;
  readonly leistungsart: string;
  readonly date: string;
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
  halbjahr: formatHalbjahrLabel(entry),
  leistungsart: leistungsartLabel[entry.leistungsart],
  date: longDate(entry.datum),
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
  const notenpunkte = entries.map((entry) => entry.punkte);
  const schnitte = entries.flatMap((entry) =>
    entry.schnitt === null ? [] : [entry.schnitt],
  );
  const [first] = schnitte;
  const last = schnitte.at(-1);
  let direction = 'gleich geblieben';
  if (first !== undefined && last !== undefined && last > first) {
    direction = 'gestiegen';
  } else if (first !== undefined && last !== undefined && last < first) {
    direction = 'gesunken';
  }
  const verlauf =
    last === undefined
      ? 'Noch geht keine Note in einen Fachschnitt ein.'
      : `Der laufende Schnitt ist ${direction}.`;
  return {
    rows: entries.map((entry, index) => {
      const point = createTrendPointText(entry);
      return {
        id: `${index}-${entry.datum}-${entry.fachKuerzel}`,
        halbjahr: point.halbjahr,
        leistungsart: point.leistungsart,
        date: point.date,
        fach: point.fach,
        note: point.note,
        notenpunkte: formatNote(entry.punkte, 'punkte'),
        average:
          entry.schnitt === null ? '—' : formatNote(entry.schnitt, 'punkte'),
      };
    }),
    summary: `${verlauf} Niedrigster Einzelwert: ${formatNote(Math.min(...notenpunkte), 'punkte')}; höchster Einzelwert: ${formatNote(Math.max(...notenpunkte), 'punkte')}; aktueller Schnitt: ${last === undefined ? '—' : formatNote(last, 'punkte')}.`,
  };
};
