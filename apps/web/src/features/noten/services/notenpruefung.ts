import type {
  Leistungsart,
  Notensystem,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import { notenGrenzen } from '../schemas/note-schema.ts';

/** Standardbereich je Leistungsart; die Eingabe darf ihn überschreiben. */
export const standardBereich = (kind: Leistungsart): Wertungsbereich =>
  kind === 'muendlich' || kind === 'sonstige' ? 'muendlich' : 'schriftlich';

/**
 * Gültige native Werte: 1,00–6,00 im Sechsersystem, ganze 0–15 Notenpunkte
 * im Punktesystem.
 */
export const istWertGueltig = (wert: number, system: Notensystem): boolean =>
  system === 'punkte'
    ? Number.isInteger(wert) && wert >= 0 && wert <= notenGrenzen.punkteMax
    : wert >= notenGrenzen.sechserMin && wert <= notenGrenzen.sechserMax;
