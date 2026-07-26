import { fachAverage } from '#/shared/noten/fach-aggregation.ts';
import type {
  Assessment,
  Fachgewichtung,
  Leistungsart,
} from '#/shared/noten/notenwert.ts';

export type TrendNote = {
  readonly date: string;
  /** Auf Notenpunkte (0–15) normalisierter Wert. */
  readonly notenpunkte: number;
  readonly individualGewichtung: number;
  readonly fachSnapshotId: string;
  readonly fachShortName: string;
  readonly leistungsart: Leistungsart;
  readonly fachGewichtung: Fachgewichtung;
};

export type TrendEntry = {
  readonly datum: string;
  readonly punkte: number;
  /** Laufender gewichteter Schnitt in Notenpunkten. */
  readonly schnitt: number;
  readonly fachKuerzel: string;
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
      datum: note.date,
      punkte: roundToPrecision(note.notenpunkte),
      schnitt: roundToPrecision(total),
      fachKuerzel: note.fachShortName,
    };
  });
};
