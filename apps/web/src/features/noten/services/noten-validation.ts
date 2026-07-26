import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { notenLimits } from '../schemas/note-schema.ts';

/**
 * Ein Fach muss zum Schuljahr gehören. Ein archiviertes Fach nimmt keine
 * neuen Noten mehr auf und keine Note zieht in eines um — aber eine Note, die
 * schon daran hängt, bleibt korrigierbar und behält ihr Fach.
 */
export const isFachSelectable = (
  fach: { readonly id: string; readonly archived: boolean } | undefined,
  currentFachId: string | null,
): boolean =>
  fach !== undefined && (!fach.archived || fach.id === currentFachId);

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
