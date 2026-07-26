import { Schema } from 'effect';

export const learningLimits = {
  maxMinutes: 720,
} as const;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

export const StudyDayInput = Schema.Struct({
  day: Schema.String.pipe(Schema.pattern(isoDatePattern)),
  /** Optional einem Fach zugeordnet; null = allgemeiner Lerntag. */
  fachId: Schema.NullOr(Schema.String),
  minutes: Schema.NullOr(
    Schema.Int.pipe(
      Schema.positive(),
      Schema.lessThanOrEqualTo(learningLimits.maxMinutes),
    ),
  ),
  comment: Schema.NullOr(Schema.String),
});

export type StudyDayInput = typeof StudyDayInput.Type;
