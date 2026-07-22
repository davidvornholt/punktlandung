import type {
  Fachgewichtung,
  Leistung,
  Leistungsart,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import { fachschnitt } from '#/shared/noten/notenwert.ts';

export type VerlaufsNote = {
  readonly datum: string;
  /** Auf Notenpunkte (0–15) normalisierter Wert. */
  readonly punkte: number;
  readonly gewicht: number;
  readonly fachStandId: string;
  readonly fachKuerzel: string;
  readonly kind: Leistungsart;
  readonly area: Wertungsbereich;
  readonly gewichtung: Fachgewichtung;
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
  const proFach = new Map<
    string,
    {
      readonly leistungen: Array<Leistung>;
      readonly gewichtung: Fachgewichtung;
    }
  >();
  return noten.map((note) => {
    const fach = proFach.get(note.fachStandId) ?? {
      leistungen: [],
      gewichtung: note.gewichtung,
    };
    fach.leistungen.push({
      value: note.punkte,
      weight: note.gewicht,
      kind: note.kind,
      area: note.area,
    });
    proFach.set(note.fachStandId, fach);
    const fachSchnitte = [...proFach.values()].flatMap(
      ({ leistungen, gewichtung }) => {
        const schnitt = fachschnitt(leistungen, gewichtung);
        return schnitt === null ? [] : [schnitt];
      },
    );
    const gesamt =
      fachSchnitte.reduce((summe, wert) => summe + wert, 0) /
      fachSchnitte.length;
    return {
      datum: note.datum,
      punkte: runde(note.punkte),
      schnitt: runde(gesamt),
      fachKuerzel: note.fachKuerzel,
    };
  });
};
