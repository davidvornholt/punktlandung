import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { notenGrenzen } from '../schemas/note-schema.ts';

/**
 * Gültige native Werte: 1,00–6,00 im Sechsersystem, ganze 0–15 Notenpunkte
 * im Punktesystem.
 */
export const istWertGueltig = (wert: number, system: Notensystem): boolean =>
  system === 'punkte'
    ? Number.isInteger(wert) && wert >= 0 && wert <= notenGrenzen.punkteMax
    : wert >= notenGrenzen.sechserMin && wert <= notenGrenzen.sechserMax;
