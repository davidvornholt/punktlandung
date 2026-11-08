import type { Notensystem } from './notenwert.ts';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const minNotenpunkte = 0;
const maxNotenpunkte = 15;
const bestNote = 1;
const worstNote = 6;
const quarterStepsPerNote = 4;
const halbeNote = 0.5;
const grenzfallTolerance = 0.1;
const grenzfallScale = 1_000_000;
const roundingFactor = 100;
const noisePrecision = 1_000_000_000;

/**
 * Rundet halb auf, nachdem es das Gleitkommarauschen der Gewichtung entfernt
 * hat: Ein exakter Schnitt von 2,5 kommt oft als 2,4999999999999996 an und
 * würde sonst abgerundet.
 */
const roundHalfUp = (value: number): number =>
  Math.round(Math.round(value * noisePrecision) / noisePrecision);

/**
 * Halbjahresnote in Viertelstufen (1; 1,25 = "1-"; 1,5 = "1-2"; 1,75 = "2+").
 * Im Punktesystem sind Halbjahresnoten ganze Notenpunkte.
 */
export const halbjahresnote = (average: number, system: Notensystem): number =>
  system === 'punkte'
    ? clamp(roundHalfUp(average), minNotenpunkte, maxNotenpunkte)
    : clamp(
        roundHalfUp(average * quarterStepsPerNote) / quarterStepsPerNote,
        bestNote,
        worstNote,
      );

export type Jahresnote = {
  readonly note: number;
  /** Schnitt nahe ,5 — pädagogischer Ermessensspielraum der Lehrkraft. */
  readonly grenzfall: boolean;
};

/**
 * Jahresvorschau: nur ganze Noten. Bei ,5 rundet sie bewusst pessimistisch zur
 * schlechteren Note und markiert den Grenzfall.
 */
export const jahresnote = (average: number): Jahresnote => {
  const note = clamp(roundHalfUp(average), bestNote, worstNote);
  const scaled = Math.round(average * grenzfallScale);
  const rest = scaled % grenzfallScale;
  const distance = Math.abs(rest - halbeNote * grenzfallScale);
  return {
    note,
    grenzfall: distance <= grenzfallTolerance * grenzfallScale,
  };
};

const remainderBelowQuarter = 1;
const halfRemainder = 2;

/** Formatiert eine Viertelstufen-Note: 1,25 → "1-", 1,5 → "1-2", 1,75 → "2+". */
export const formatHalbnote = (quarters: number): string => {
  const base = Math.floor(quarters);
  const rest = Math.round((quarters - base) * quarterStepsPerNote);
  if (rest === 0) {
    return `${base}`;
  }
  if (rest === remainderBelowQuarter) {
    return `${base}-`;
  }
  if (rest === halfRemainder) {
    return `${base}-${base + 1}`;
  }
  return `${base + 1}+`;
};

/** Formatiert einen nativen Notenwert fürs UI ("2,25" bzw. "11 P."). */
export const formatNote = (value: number, system: Notensystem): string => {
  const numberValue =
    `${Math.round(value * roundingFactor) / roundingFactor}`.replace('.', ',');
  return system === 'punkte' ? `${numberValue} P.` : numberValue;
};
