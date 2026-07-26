import type { NotenFelder } from '../schemas/note-schema.ts';
import type { NoteMitFach } from '../services/noten-service.ts';

/** Rohe Formulareingaben, so wie sie aus den Feldern kommen. */
export type NoteEingaben = Readonly<Record<keyof NotenFelder, string>>;

const zahl = (roh: string) => Number(roh.replace(',', '.'));

/**
 * Vorbelegung der Notenfelder: bestehende Note beim Bearbeiten, sonst leer
 * mit dem vorgeschlagenen Datum für den Schnelleintrag.
 */
export const noteFormWerte = (note: NoteMitFach | null, datum: string) => ({
  subjectId: note?.fachId ?? '',
  kind: note?.kind ?? 'klausur',
  area: note?.area ?? '',
  wert: note === null ? '' : `${note.wert}`,
  gewicht: note?.gewicht ?? 1,
  datum: note?.datum ?? datum,
  notiz: note?.notiz ?? '',
});

/**
 * Übersetzt die Formulareingaben in Notenfelder: Dezimalkomma zählt wie Punkt,
 * ein leeres Gewicht bedeutet einfache Wertung, ein leerer Bereich überlässt
 * die Ableitung dem Service.
 */
export const noteFelderAusEingaben = (eingaben: NoteEingaben): NotenFelder => ({
  subjectId: eingaben.subjectId.trim(),
  kind: eingaben.kind.trim() as NotenFelder['kind'],
  ...(eingaben.area === 'schriftlich' || eingaben.area === 'muendlich'
    ? { area: eingaben.area }
    : {}),
  wert: zahl(eingaben.wert.trim()),
  gewicht: eingaben.gewicht.trim() === '' ? 1 : zahl(eingaben.gewicht.trim()),
  datum: eingaben.datum.trim(),
  notiz: eingaben.notiz.trim() === '' ? null : eingaben.notiz.trim(),
});
