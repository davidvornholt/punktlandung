import {
  fachAverage,
  leistungsanteile,
} from '#/shared/noten/fach-aggregation.ts';
import type {
  Fachgewichtung,
  Leistungsart,
  Notensystem,
} from '#/shared/noten/notenwert.ts';
import type { Klassenstufe } from '#/shared/school/klassenstufe.ts';

export type TrendNote = {
  readonly id: string;
  readonly date: string;
  /** Auf Notenpunkte (0–15) normalisierter Wert. */
  readonly notenpunkte: number;
  /** Der eingetragene Wert im Notensystem seines Halbjahrs. */
  readonly notenwert: number;
  readonly notensystem: Notensystem;
  readonly individualGewichtung: number;
  readonly fachId: string;
  /** Ein Fach in einem Schuljahr: Dafür gibt es je einen Fachschnitt. */
  readonly fachSnapshotId: string;
  readonly fachShortName: string;
  readonly fachName: string;
  readonly leistungsart: Leistungsart;
  readonly fachGewichtung: Fachgewichtung;
  readonly halbjahrId: string;
  readonly klassenstufe: Klassenstufe;
  readonly half: 1 | 2;
};

export type TrendEntry = {
  readonly id: string;
  readonly datum: string;
  readonly punkte: number;
  /**
   * Laufender gewichteter Schnitt in Notenpunkten; null, solange noch keine
   * Note in einen Fachschnitt eingeht (etwa nur schriftliche Noten in einem
   * Fach, das schriftlich mit 0 % wertet).
   */
  readonly schnitt: number | null;
  /**
   * Der Anteil der Note am heutigen Gesamtschnitt (0–1). Über alle Noten
   * summiert er sich zu 1, und die Summe aus Anteil mal Notenpunkten ist der
   * Gesamtschnitt: So groß zeichnet die Übersicht den Punkt der Note.
   */
  readonly mass: number;
  readonly fachId: string;
  readonly fachKuerzel: string;
  readonly fachName: string;
  /** Der eingetragene Wert im Notensystem seines Halbjahrs. */
  readonly notenwert: number;
  readonly notensystem: Notensystem;
  readonly leistungsart: Leistungsart;
  readonly halbjahrId: string;
  /** Verortet den Punkt auf der über alle Schuljahre laufenden Linie. */
  readonly klassenstufe: Klassenstufe;
  readonly half: 1 | 2;
};

const roundingFactor = 100;

const roundToPrecision = (value: number): number =>
  Math.round(value * roundingFactor) / roundingFactor;

type FachNoten = {
  readonly noten: Array<TrendNote>;
  readonly fachGewichtung: Fachgewichtung;
};

const fachschnitt = ({ noten, fachGewichtung }: FachNoten): number | null =>
  fachAverage(
    noten.map((note) => ({
      notenwert: note.notenpunkte,
      individualGewichtung: note.individualGewichtung,
      leistungsart: note.leistungsart,
    })),
    fachGewichtung,
  );

/** Ordnet die Noten ihrem Fach im Schuljahr zu, in der Reihenfolge ihres ersten Auftretens. */
const byFach = (noten: ReadonlyArray<TrendNote>): Map<string, FachNoten> => {
  const faecher = new Map<string, FachNoten>();
  for (const note of noten) {
    const fach = faecher.get(note.fachSnapshotId) ?? {
      noten: [],
      fachGewichtung: note.fachGewichtung,
    };
    fach.noten.push(note);
    faecher.set(note.fachSnapshotId, fach);
  }
  return faecher;
};

const mean = (values: ReadonlyArray<number>): number | null =>
  values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;

const schnittOf = (faecher: ReadonlyMap<string, FachNoten>): number | null =>
  mean(
    [...faecher.values()].flatMap((fach) => {
      const average = fachschnitt(fach);
      return average === null ? [] : [average];
    }),
  );

/**
 * Der ungerundete Gesamtschnitt in Notenpunkten: das Mittel der Fachschnitte,
 * je einer pro Fach und Schuljahr. Jedes Fach zählt in jedem Schuljahr gleich
 * viel, gleich wie viele Noten es hat. `null`, solange keine Note in einen
 * Fachschnitt eingeht.
 */
export const gesamtschnitt = (noten: ReadonlyArray<TrendNote>): number | null =>
  schnittOf(byFach(noten));

/**
 * Der Anteil jeder Note am Gesamtschnitt (0–1), nach Noten-ID: ihr Anteil am
 * Fachschnitt, geteilt durch die Anzahl der Fachschnitte. Eine Note, deren
 * Fach noch keinen Schnitt hat, trägt nichts. Die Summe aus Anteil mal
 * Notenpunkten ist genau `gesamtschnitt`.
 */
export const noteMasses = (
  noten: ReadonlyArray<TrendNote>,
): ReadonlyMap<string, number> => {
  const faecher = [...byFach(noten).values()];
  const counted = faecher.filter((fach) => fachschnitt(fach) !== null);
  const masses = new Map<string, number>(noten.map((note) => [note.id, 0]));
  for (const fach of counted) {
    const anteile = leistungsanteile(
      fach.noten.map((note) => ({
        id: note.id,
        individualGewichtung: note.individualGewichtung,
        leistungsart: note.leistungsart,
      })),
      fach.fachGewichtung,
    );
    for (const [id, anteil] of anteile) {
      masses.set(id, anteil / counted.length);
    }
  }
  return masses;
};

/**
 * Formt chronologisch sortierte, normalisierte Noten in die Punkte der
 * Übersicht um: Jeder Eintrag trägt den bis dahin laufenden gewichteten
 * Gesamtschnitt und seinen Anteil am heutigen.
 */
export const calculateTrend = (
  noten: ReadonlyArray<TrendNote>,
): ReadonlyArray<TrendEntry> => {
  const masses = noteMasses(noten);
  const faecher = new Map<string, FachNoten>();
  return noten.map((note) => {
    const fach = faecher.get(note.fachSnapshotId) ?? {
      noten: [],
      fachGewichtung: note.fachGewichtung,
    };
    fach.noten.push(note);
    faecher.set(note.fachSnapshotId, fach);
    const schnitt = schnittOf(faecher);
    return {
      id: note.id,
      datum: note.date,
      punkte: roundToPrecision(note.notenpunkte),
      schnitt: schnitt === null ? null : roundToPrecision(schnitt),
      mass: masses.get(note.id) ?? 0,
      fachId: note.fachId,
      fachKuerzel: note.fachShortName,
      fachName: note.fachName,
      notenwert: note.notenwert,
      notensystem: note.notensystem,
      leistungsart: note.leistungsart,
      halbjahrId: note.halbjahrId,
      klassenstufe: note.klassenstufe,
      half: note.half,
    };
  });
};
