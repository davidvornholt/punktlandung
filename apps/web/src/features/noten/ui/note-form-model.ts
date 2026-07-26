import type { NotenFields } from '../schemas/note-schema.ts';
import type { NoteWithFach } from '../services/noten-service.ts';

/** Rohe Formulareingaben, so wie sie aus den Feldern kommen. */
export type NoteFormValues = Readonly<Record<keyof NotenFields, string>>;

const toNumber = (raw: string) => Number(raw.replace(',', '.'));

/** Vorbelegung für den Schnelleintrag: leere Felder mit vorgeschlagenem Datum. */
export const emptyNoteFormValues = (defaultDate: string): NoteFormValues => ({
  subjectId: '',
  kind: 'klausur',
  wert: '',
  gewicht: '1',
  datum: defaultDate,
  notiz: '',
});

/** Vorbelegung beim Bearbeiten: die gespeicherten Werte der Note. */
export const noteFormValues = (note: NoteWithFach): NoteFormValues => ({
  subjectId: note.fachId,
  kind: note.kind,
  wert: `${note.wert}`,
  gewicht: `${note.gewicht}`,
  datum: note.datum,
  notiz: note.notiz ?? '',
});

/**
 * Übersetzt die Formulareingaben in Notenfelder: Dezimalkomma zählt wie Punkt,
 * ein leeres Gewicht bedeutet einfache Wertung.
 */
export const noteFieldsFromValues = (values: NoteFormValues): NotenFields => ({
  subjectId: values.subjectId.trim(),
  kind: values.kind.trim() as NotenFields['kind'],
  wert: toNumber(values.wert.trim()),
  gewicht: values.gewicht.trim() === '' ? 1 : toNumber(values.gewicht.trim()),
  datum: values.datum.trim(),
  notiz: values.notiz.trim() === '' ? null : values.notiz.trim(),
});
