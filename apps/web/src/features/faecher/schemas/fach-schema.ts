import { Schema } from 'effect';

import { FachgewichtungSchema } from '#/shared/noten/fach-gewichtung.ts';

/** Eingabegrenzen — auch die Formulare nutzen sie für ihre Attribute. */
export const fachGrenzen = {
  nameMax: 100,
  kuerzelMax: 10,
} as const;

export const FachFelder = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(fachGrenzen.nameMax),
  ),
  shortName: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(fachGrenzen.kuerzelMax),
  ),
  gewichtung: FachgewichtungSchema,
});

export type FachFelder = typeof FachFelder.Type;

export const FachEingabe = Schema.Struct({
  schoolYear: Schema.String,
  ...FachFelder.fields,
});

export type FachEingabe = typeof FachEingabe.Type;

export const FachAktualisierung = Schema.Struct({
  id: Schema.String,
  ...FachEingabe.fields,
});

export type FachAktualisierung = typeof FachAktualisierung.Type;

export const FachKennung = Schema.Struct({
  id: Schema.String,
  schoolYear: Schema.String,
});

export type FachKennung = typeof FachKennung.Type;

export const FaecherAbfrage = Schema.Struct({
  schoolYear: Schema.String,
});
