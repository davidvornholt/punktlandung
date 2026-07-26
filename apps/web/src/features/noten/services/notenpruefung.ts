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
 * Ein Fach muss zum Schuljahr gehören. Ein archiviertes Fach nimmt keine
 * neuen Noten mehr auf und keine Note zieht in eines um — aber eine Note, die
 * schon daran hängt, bleibt korrigierbar und behält ihr Fach.
 */
export const istFachWaehlbar = (
  fach: { readonly id: string; readonly archived: boolean } | undefined,
  bisherigesFach: string | null,
): boolean =>
  fach !== undefined && (!fach.archived || fach.id === bisherigesFach);

/**
 * Gültige native Werte: 1,00–6,00 im Sechsersystem, ganze 0–15 Notenpunkte
 * im Punktesystem.
 */
export const istWertGueltig = (wert: number, system: Notensystem): boolean =>
  system === 'punkte'
    ? Number.isInteger(wert) && wert >= 0 && wert <= notenGrenzen.punkteMax
    : wert >= notenGrenzen.sechserMin && wert <= notenGrenzen.sechserMax;
