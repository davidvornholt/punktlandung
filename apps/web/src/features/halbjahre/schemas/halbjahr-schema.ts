import { Schema } from 'effect';

import { klassenstufen } from '#/shared/schule/klassenstufe.ts';
import { schuljahrMuster } from '#/shared/schule/schuljahr.ts';

const isoDatumMuster = /^\d{4}-\d{2}-\d{2}$/u;

const IsoDatum = Schema.String.pipe(Schema.pattern(isoDatumMuster));

const zeitraumGueltig = (zeitraum: {
  readonly startsOn: string;
  readonly endsOn: string;
}) =>
  zeitraum.startsOn < zeitraum.endsOn
    ? undefined
    : 'Das Enddatum muss nach dem Beginn liegen.';

/**
 * Das Notensystem gehört bewusst nicht dazu: es folgt der Klassenstufe und
 * wird serverseitig abgeleitet, damit kein Aufrufer die beiden entkoppeln kann.
 */
const HalbjahrFelder = Schema.Struct({
  /** Klassenstufe, z. B. "10" oder "J1". */
  klassenstufe: Schema.Literal(...klassenstufen),
  /** Schuljahr, z. B. "2026/27". */
  schoolYear: Schema.String.pipe(Schema.pattern(schuljahrMuster)),
  half: Schema.Literal(1, 2),
  startsOn: IsoDatum,
  endsOn: IsoDatum,
});

export const HalbjahrEingabe = HalbjahrFelder.pipe(
  Schema.filter(zeitraumGueltig),
);

export type HalbjahrEingabe = typeof HalbjahrEingabe.Type;

export const HalbjahrAktualisierung = Schema.Struct({
  id: Schema.String,
  ...HalbjahrFelder.fields,
}).pipe(Schema.filter(zeitraumGueltig));

export type HalbjahrAktualisierung = typeof HalbjahrAktualisierung.Type;
