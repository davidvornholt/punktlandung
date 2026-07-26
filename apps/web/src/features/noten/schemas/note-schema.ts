import { Schema } from 'effect';

export const notenLimits = {
  maxGewichtung: 10,
  gewichtungStep: 0.25,
  maxNotenpunkte: 15,
  sechserMin: 1,
  sechserMax: 6,
} as const;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

const Leistungsart = Schema.Literal(
  'klausur',
  'test',
  'muendlich',
  'gfs',
  'sonstige',
);

const Wertungsbereich = Schema.Literal('schriftlich', 'muendlich');

const NotenFields = Schema.Struct({
  fachId: Schema.String,
  leistungsart: Leistungsart,
  /** Ohne Angabe leitet der Service den Bereich aus der Leistungsart ab. */
  wertungsbereich: Schema.optional(Wertungsbereich),
  /** Nativer Wert; die Systemprüfung übernimmt der Service anhand des Halbjahrs. */
  notenwert: Schema.Number,
  individualGewichtung: Schema.Number.pipe(
    Schema.positive(),
    Schema.lessThanOrEqualTo(notenLimits.maxGewichtung),
  ),
  date: Schema.String.pipe(Schema.pattern(isoDatePattern)),
  comment: Schema.NullOr(Schema.String),
});

export const NoteInput = Schema.Struct({
  halbjahrId: Schema.String,
  ...NotenFields.fields,
});

export type NoteInput = typeof NoteInput.Type;

export const NoteUpdate = Schema.Struct({
  id: Schema.String,
  ...NotenFields.fields,
});

export type NoteUpdate = typeof NoteUpdate.Type;

export const NoteId = Schema.Struct({
  id: Schema.String,
});

export const NotenQuery = Schema.Struct({
  halbjahrId: Schema.String,
});
