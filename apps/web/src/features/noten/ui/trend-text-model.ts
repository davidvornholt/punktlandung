import { formatIsoDate } from '#/shared/date/calendar-date.ts';
import { nbsp } from '#/shared/date/date-text.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import type { TrendEntry } from '../services/trend-calculation.ts';

/**
 * Eine Note des Verlaufs in Worten. Der Verlauf läuft über alle Schuljahre,
 * deshalb verortet das Halbjahr die Note. Und weil er alles auf Notenpunkte
 * normalisiert, steht neben der eingetragenen Note der Punktwert, auf dem ihr
 * Punkt auf der Skala liegt.
 */
export type TrendTextRow = {
  readonly id: string;
  readonly halbjahr: string;
  readonly leistungsart: string;
  readonly date: string;
  readonly fach: string;
  /** Die Note, wie sie eingetragen wurde. */
  readonly note: string;
  readonly notenpunkte: string;
  /** Der Gesamtschnitt nach dieser Note. */
  readonly average: string;
};

export type TrendTextModel = {
  readonly rows: ReadonlyArray<TrendTextRow>;
  readonly summary: string;
};

/** „10,7 P.“ für den Fließtext: Zahl und Einheit bleiben in einer Zeile. */
const points = (value: number): string =>
  formatNote(value, 'punkte').replace(' ', nbsp);

/** Hero und Verlauf der Übersicht als Text: jede Note mit dem Gesamtschnitt nach ihr. */
export const createTrendTextModel = (
  entries: ReadonlyArray<TrendEntry>,
): TrendTextModel => {
  if (entries.length === 0) {
    return {
      rows: [],
      summary: 'Noch keine Noten für den Verlauf.',
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
      : `Der Gesamtschnitt ist seit der ersten Note ${direction}.`;
  return {
    rows: entries.map((entry) => ({
      id: entry.id,
      halbjahr: formatHalbjahrLabel(entry),
      leistungsart: leistungsartLabel[entry.leistungsart],
      date: formatIsoDate(entry.datum),
      fach: entry.fachName,
      note: formatNote(entry.notenwert, entry.notensystem),
      notenpunkte: formatNote(entry.punkte, 'punkte'),
      average:
        entry.schnitt === null ? '—' : formatNote(entry.schnitt, 'punkte'),
    })),
    // Der Punkt von „P.“ schließt den Satz: Ein zweiter folgt nicht.
    summary: `${verlauf} Die niedrigste Note liegt bei ${points(Math.min(...notenpunkte))}, die höchste bei ${points(Math.max(...notenpunkte))}${last === undefined ? '' : `, der Gesamtschnitt heute bei ${points(last)}`}`,
  };
};
