import { Schema } from 'effect';

/** Eingabegrenzen — auch die Formulare nutzen sie für ihre Attribute. */
export const fachLimits = {
  nameMax: 100,
  maxShortName: 10,
  maxShare: 100,
  maxGewichtung: 10,
  gewichtungStep: 0.25,
} as const;

/** Gewicht einer Leistungsart, wie von der Lehrkraft verkündet. */
const Gewichtung = Schema.Number.pipe(
  Schema.positive(),
  Schema.lessThanOrEqualTo(fachLimits.maxGewichtung),
);

export const FachFields = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(fachLimits.nameMax),
  ),
  shortName: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(fachLimits.maxShortName),
  ),
  /** Anteil schriftlicher Noten in Prozent; null = eine gemeinsame Liste. */
  schriftlichShare: Schema.NullOr(
    Schema.Int.pipe(Schema.between(0, fachLimits.maxShare)),
  ),
  klausurGewichtung: Gewichtung,
  testGewichtung: Gewichtung,
  muendlichGewichtung: Gewichtung,
  gfsGewichtung: Gewichtung,
  sonstigeGewichtung: Gewichtung,
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
