import { Schema } from 'effect';

/** Eingabegrenzen — auch die Formulare nutzen sie für ihre Attribute. */
export const fachGrenzen = {
  nameMax: 100,
  kuerzelMax: 10,
  anteilMax: 100,
  gewichtMax: 10,
  gewichtSchritt: 0.25,
} as const;

/** Gewicht einer Leistungsart, wie von der Lehrkraft verkündet. */
const Gewicht = Schema.Number.pipe(
  Schema.positive(),
  Schema.lessThanOrEqualTo(fachGrenzen.gewichtMax),
);

export const FachEingabe = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(fachGrenzen.nameMax),
  ),
  shortName: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(fachGrenzen.kuerzelMax),
  ),
  /** Anteil schriftlicher Noten in Prozent; null = eine gemeinsame Liste. */
  writtenShare: Schema.NullOr(
    Schema.Int.pipe(Schema.between(0, fachGrenzen.anteilMax)),
  ),
  klausurWeight: Gewicht,
  testWeight: Gewicht,
  muendlichWeight: Gewicht,
  gfsWeight: Gewicht,
  sonstigeWeight: Gewicht,
});

export type FachEingabe = typeof FachEingabe.Type;

export const FachAktualisierung = Schema.Struct({
  id: Schema.String,
  ...FachEingabe.fields,
});

export type FachAktualisierung = typeof FachAktualisierung.Type;

export const FachKennung = Schema.Struct({
  id: Schema.String,
});

export type FachKennung = typeof FachKennung.Type;
