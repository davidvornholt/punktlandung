export type VerlaufsNote = {
  readonly datum: string;
  /** Auf Notenpunkte (0–15) normalisierter Wert. */
  readonly punkte: number;
  /** Effektives Gewicht: Einzelgewicht × Artgewicht des Fachs. */
  readonly gewicht: number;
  readonly fachKuerzel: string;
};

export type VerlaufsEintrag = {
  readonly datum: string;
  readonly punkte: number;
  /** Laufender gewichteter Schnitt in Notenpunkten. */
  readonly schnitt: number;
  readonly fachKuerzel: string;
};

const rundungsFaktor = 100;

const runde = (wert: number): number =>
  Math.round(wert * rundungsFaktor) / rundungsFaktor;

/**
 * Formt chronologisch sortierte, normalisierte Noten in Chartpunkte um:
 * jeder Eintrag trägt den bis dahin laufenden gewichteten Gesamtschnitt.
 */
export const berechneVerlauf = (
  noten: ReadonlyArray<VerlaufsNote>,
): ReadonlyArray<VerlaufsEintrag> => {
  let summe = 0;
  let gewichte = 0;
  return noten.map((note) => {
    summe += note.punkte * note.gewicht;
    gewichte += note.gewicht;
    return {
      datum: note.datum,
      punkte: runde(note.punkte),
      schnitt: runde(summe / gewichte),
      fachKuerzel: note.fachKuerzel,
    };
  });
};
