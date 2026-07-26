import { Schema } from 'effect';

import { klassenstufen } from '#/shared/school/klassenstufe.ts';
import { schoolYearPattern } from '#/shared/school/school-year.ts';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

const IsoDate = Schema.String.pipe(Schema.pattern(isoDatePattern));

const dateRangeValid = (dateRange: {
  readonly startsOn: string;
  readonly endsOn: string;
}) =>
  dateRange.startsOn < dateRange.endsOn
    ? undefined
    : 'Das Enddatum muss nach dem Beginn liegen.';

/**
 * Das Notensystem gehört bewusst nicht dazu: es folgt der Klassenstufe und
 * wird serverseitig abgeleitet, damit kein Aufrufer die beiden entkoppeln kann.
 */
const HalbjahrFields = Schema.Struct({
  /** Klassenstufe, z. B. "10" oder "J1". */
  klassenstufe: Schema.Literal(...klassenstufen),
  /** Schuljahr, z. B. "2026/27". */
  schoolYear: Schema.String.pipe(Schema.pattern(schoolYearPattern)),
  half: Schema.Literal(1, 2),
  startsOn: IsoDate,
  endsOn: IsoDate,
});

export const HalbjahrInput = HalbjahrFields.pipe(Schema.filter(dateRangeValid));

export type HalbjahrInput = typeof HalbjahrInput.Type;

export const HalbjahrUpdate = Schema.Struct({
  id: Schema.String,
  ...HalbjahrFields.fields,
}).pipe(Schema.filter(dateRangeValid));

export type HalbjahrUpdate = typeof HalbjahrUpdate.Type;
