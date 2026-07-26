import type {
  Assessment,
  Fachgewichtung,
  Leistungsart,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import { fachAverage } from '#/shared/noten/notenwert.ts';

export type TrendNote = {
  readonly date: string;
  /** Auf Notenpunkte (0–15) normalisierter Wert. */
  readonly notenpunkte: number;
  readonly individualGewichtung: number;
  readonly fachSnapshotId: string;
  readonly fachShortName: string;
  readonly leistungsart: Leistungsart;
  readonly wertungsbereich: Wertungsbereich;
  readonly fachGewichtung: Fachgewichtung;
};

export type TrendEntry = {
  readonly date: string;
  readonly notenpunkte: number;
  /** Laufender gewichteter Schnitt in Notenpunkten. */
  readonly average: number;
  readonly fachShortName: string;
};

const roundingFactor = 100;

const roundToPrecision = (value: number): number =>
  Math.round(value * roundingFactor) / roundingFactor;

/**
 * Formt chronologisch sortierte, normalisierte Noten in Chartpunkte um:
 * jeder Eintrag trägt den bis dahin laufenden gewichteten Gesamtschnitt.
 */
export const calculateTrend = (
  noten: ReadonlyArray<TrendNote>,
): ReadonlyArray<TrendEntry> => {
  const byFach = new Map<
    string,
    {
      readonly assessments: Array<Assessment>;
      readonly fachGewichtung: Fachgewichtung;
    }
  >();
  return noten.map((note) => {
    const fach = byFach.get(note.fachSnapshotId) ?? {
      assessments: [],
      fachGewichtung: note.fachGewichtung,
    };
    fach.assessments.push({
      notenwert: note.notenpunkte,
      individualGewichtung: note.individualGewichtung,
      leistungsart: note.leistungsart,
      wertungsbereich: note.wertungsbereich,
    });
    byFach.set(note.fachSnapshotId, fach);
    const fachAverages = [...byFach.values()].flatMap(
      ({ assessments, fachGewichtung }) => {
        const average = fachAverage(assessments, fachGewichtung);
        return average === null ? [] : [average];
      },
    );
    const total =
      fachAverages.reduce((sum, value) => sum + value, 0) / fachAverages.length;
    return {
      date: note.date,
      notenpunkte: roundToPrecision(note.notenpunkte),
      average: roundToPrecision(total),
      fachShortName: note.fachShortName,
    };
  });
};
