import { Schema } from 'effect';

export const halbjahrGrenzen = {
  labelMax: 20,
} as const;

const isoDatumMuster = /^\d{4}-\d{2}-\d{2}$/u;
const schuljahrMuster = /^\d{4}\/\d{2}$/u;

const IsoDatum = Schema.String.pipe(Schema.pattern(isoDatumMuster));

const zeitraumGueltig = (zeitraum: {
  readonly startsOn: string;
  readonly endsOn: string;
}) =>
  zeitraum.startsOn < zeitraum.endsOn
    ? undefined
    : 'Das Enddatum muss nach dem Beginn liegen.';

const HalbjahrFelder = Schema.Struct({
  /** Anzeigename, z. B. "10.2" oder "K1.1". */
  label: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(halbjahrGrenzen.labelMax),
  ),
  /** Schuljahr, z. B. "2026/27". */
  schoolYear: Schema.String.pipe(Schema.pattern(schuljahrMuster)),
  half: Schema.Literal(1, 2),
  system: Schema.Literal('sechser', 'punkte'),
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
