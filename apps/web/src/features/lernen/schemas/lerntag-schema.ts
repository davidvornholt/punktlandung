import { Schema } from 'effect';

export const lernGrenzen = {
  minutenMax: 720,
} as const;

const isoDatumMuster = /^\d{4}-\d{2}-\d{2}$/u;

export const LerntagEingabe = Schema.Struct({
  day: Schema.String.pipe(Schema.pattern(isoDatumMuster)),
  /** Optional einem Fach zugeordnet; null = allgemeiner Lerntag. */
  subjectId: Schema.NullOr(Schema.String),
  minutes: Schema.NullOr(
    Schema.Int.pipe(
      Schema.positive(),
      Schema.lessThanOrEqualTo(lernGrenzen.minutenMax),
    ),
  ),
  notiz: Schema.NullOr(Schema.String),
});

export type LerntagEingabe = typeof LerntagEingabe.Type;
