import type {
  Leistungsart,
  Notensystem,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import { notenLimits } from '../schemas/note-schema.ts';

/** Standardbereich je Leistungsart; die Eingabe darf ihn überschreiben. */
export const defaultWertungsbereich = (
  leistungsart: Leistungsart,
): Wertungsbereich =>
  leistungsart === 'muendlich' || leistungsart === 'sonstige'
    ? 'muendlich'
    : 'schriftlich';

/**
 * Gültige native Werte: 1,00–6,00 im Sechsersystem, ganze 0–15 Notenpunkte
 * im Punktesystem.
 */
export const isValueValid = (value: number, system: Notensystem): boolean =>
  system === 'punkte'
    ? Number.isInteger(value) &&
      value >= 0 &&
      value <= notenLimits.maxNotenpunkte
    : value >= notenLimits.sechserMin && value <= notenLimits.sechserMax;
