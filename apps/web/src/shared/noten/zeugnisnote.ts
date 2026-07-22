import type { Notensystem } from './notenwert.ts';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const punkteMin = 0;
const punkteMax = 15;
const noteBeste = 1;
const noteSchlechteste = 6;
const viertelstufenProNote = 4;
const halbeNote = 0.5;
const grenzfallToleranz = 0.1;
const rundungsFaktor = 100;

/**
 * Halbjahresnote in Viertelstufen (1; 1,25 = "1-"; 1,5 = "1-2"; 1,75 = "2+").
 * Im Punktesystem sind Halbjahresnoten ganze Notenpunkte.
 */
export const halbjahresnote = (schnitt: number, system: Notensystem): number =>
  system === 'punkte'
    ? clamp(Math.round(schnitt), punkteMin, punkteMax)
    : clamp(
        Math.round(schnitt * viertelstufenProNote) / viertelstufenProNote,
        noteBeste,
        noteSchlechteste,
      );

export type Jahresnote = {
  readonly note: number;
  /** Schnitt nahe ,5 — pädagogischer Ermessensspielraum der Lehrkraft. */
  readonly grenzfall: boolean;
};

/**
 * Jahreszeugnisnote: nur ganze Noten. Bei ,5 rundet die Vorschau bewusst
 * pessimistisch zur schlechteren Note und markiert den Grenzfall.
 */
export const jahresnote = (schnitt: number): Jahresnote => {
  const note = clamp(Math.round(schnitt), noteBeste, noteSchlechteste);
  const abstand = Math.abs(schnitt - Math.trunc(schnitt) - halbeNote);
  return { note, grenzfall: abstand <= grenzfallToleranz };
};

const restViertelUnter = 1;
const restHalb = 2;

/** Formatiert eine Viertelstufen-Note: 1,25 → "1-", 1,5 → "1-2", 1,75 → "2+". */
export const formatHalbnote = (viertel: number): string => {
  const basis = Math.floor(viertel);
  const rest = Math.round((viertel - basis) * viertelstufenProNote);
  if (rest === 0) {
    return `${basis}`;
  }
  if (rest === restViertelUnter) {
    return `${basis}-`;
  }
  if (rest === restHalb) {
    return `${basis}-${basis + 1}`;
  }
  return `${basis + 1}+`;
};

/** Formatiert einen nativen Notenwert fürs UI ("2,25" bzw. "11 P."). */
export const formatNote = (value: number, system: Notensystem): string => {
  const zahl = `${Math.round(value * rundungsFaktor) / rundungsFaktor}`.replace(
    '.',
    ',',
  );
  return system === 'punkte' ? `${zahl} P.` : zahl;
};
