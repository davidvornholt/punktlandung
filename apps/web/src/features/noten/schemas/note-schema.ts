import { Schema } from 'effect';

export const notenGrenzen = {
  gewichtMax: 10,
  gewichtSchritt: 0.25,
  punkteMax: 15,
  sechserMin: 1,
  sechserMax: 6,
} as const;

const isoDatumMuster = /^\d{4}-\d{2}-\d{2}$/u;

const Leistungsart = Schema.Literal(
  'klausur',
  'test',
  'muendlich',
  'gfs',
  'sonstige',
);

const Wertungsbereich = Schema.Literal('schriftlich', 'muendlich');

const NotenFelder = Schema.Struct({
  subjectId: Schema.String,
  kind: Leistungsart,
  /** Ohne Angabe leitet der Service den Bereich aus der Leistungsart ab. */
  area: Schema.optional(Wertungsbereich),
  /** Nativer Wert; die Systemprüfung übernimmt der Service anhand des Halbjahrs. */
  wert: Schema.Number,
  gewicht: Schema.Number.pipe(
    Schema.positive(),
    Schema.lessThanOrEqualTo(notenGrenzen.gewichtMax),
  ),
  datum: Schema.String.pipe(Schema.pattern(isoDatumMuster)),
  notiz: Schema.NullOr(Schema.String),
});

export const NoteEingabe = Schema.Struct({
  termId: Schema.String,
  ...NotenFelder.fields,
});

export type NoteEingabe = typeof NoteEingabe.Type;

export const NoteAktualisierung = Schema.Struct({
  id: Schema.String,
  ...NotenFelder.fields,
});

export type NoteAktualisierung = typeof NoteAktualisierung.Type;

export const NoteKennung = Schema.Struct({
  id: Schema.String,
});

export const NotenAbfrage = Schema.Struct({
  termId: Schema.String,
});
