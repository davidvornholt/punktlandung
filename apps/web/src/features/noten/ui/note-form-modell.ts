import type { NotenFelder } from '../schemas/note-schema.ts';
import type { NoteMitFach } from '../services/noten-service.ts';
import { standardBereich } from '../services/notenpruefung.ts';

/** Rohe Formulareingaben, so wie sie aus den Feldern kommen. */
export type NoteEingaben = Readonly<Record<keyof NotenFelder, string>>;

const zahl = (roh: string) => Number(roh.replace(',', '.'));

/**
 * Der Bereich einer gespeicherten Note ist immer gesetzt, auch wenn er beim
 * Eintragen nur aus der Leistungsart abgeleitet wurde. Nur ein Bereich, der
 * vom Standard der Art abweicht, ist eine bewusste Wahl und bleibt gepinnt;
 * sonst folgt er wieder der Art, wenn diese beim Bearbeiten wechselt.
 */
const bereichVorbelegung = (note: NoteMitFach) =>
  note.area === standardBereich(note.kind) ? '' : note.area;

/**
 * Vorbelegung der Notenfelder: bestehende Note beim Bearbeiten, sonst leer
 * mit dem vorgeschlagenen Datum für den Schnelleintrag.
 */
export const noteFormWerte = (note: NoteMitFach | null, datum: string) => ({
  subjectId: note?.fachId ?? '',
  kind: note?.kind ?? 'klausur',
  area: note === null ? '' : bereichVorbelegung(note),
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
