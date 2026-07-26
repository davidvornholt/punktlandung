import { Schema } from 'effect';

import { FachgewichtungSchema } from '#/shared/noten/fach-gewichtung.ts';

/** Eingabegrenzen — auch die Formulare nutzen sie für ihre Attribute. */
export const fachLimits = {
  nameMax: 100,
  maxShortName: 10,
} as const;

export const FachFields = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(fachLimits.nameMax),
  ),
  shortName: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(fachLimits.maxShortName),
  ),
  gewichtung: FachgewichtungSchema,
});

export type FachFields = typeof FachFields.Type;

export const FachInput = Schema.Struct({
  schoolYear: Schema.String,
  ...FachFields.fields,
});

export type FachInput = typeof FachInput.Type;

export const FachUpdate = Schema.Struct({
  id: Schema.String,
  ...FachInput.fields,
});

export type FachUpdate = typeof FachUpdate.Type;

export const FachId = Schema.Struct({
  id: Schema.String,
  schoolYear: Schema.String,
});

export type FachId = typeof FachId.Type;

export const FaecherQuery = Schema.Struct({
  schoolYear: Schema.String,
});
