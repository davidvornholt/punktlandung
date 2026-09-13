import { Schema } from 'effect';

import {
  leistungsarten,
  planbareLeistungsarten,
} from '#/shared/noten/notenwert.ts';

export const notenLimits = {
  maxGewichtung: 10,
  gewichtungStep: 0.25,
  maxNotenpunkte: 15,
  sechserMin: 1,
  sechserMax: 6,
} as const;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

const Leistungsart = Schema.Literal(...leistungsarten);

export const NotenFields = Schema.Struct({
  subjectId: Schema.String,
  kind: Leistungsart,
  /**
   * Nativer Wert; die Systemprüfung übernimmt der Service anhand des
   * Halbjahrs. null legt die Leistung als ausstehend an — der Service lässt
   * das nur für planbare Leistungsarten zu.
   */
  wert: Schema.NullOr(Schema.Number),
  gewicht: Schema.Number.pipe(
    Schema.positive(),
    Schema.lessThanOrEqualTo(notenLimits.maxGewichtung),
  ),
  datum: Schema.String.pipe(Schema.pattern(isoDatePattern)),
  notiz: Schema.NullOr(Schema.String),
});

export type NotenFields = typeof NotenFields.Type;

export const NoteInput = Schema.Struct({
  termId: Schema.String,
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
  termId: Schema.String,
});

export const preparationLimits = {
  /** Großzügig für eine Themenliste, eng genug gegen versehentliche Dateien. */
  maxLength: 20_000,
} as const;

const PreparationText = Schema.String.pipe(
  Schema.maxLength(preparationLimits.maxLength),
);

export const PreparationUpdate = Schema.Struct({
  id: Schema.String,
  /** null löscht die Vorbereitung. */
  preparation: Schema.NullOr(PreparationText),
});

export type PreparationUpdate = typeof PreparationUpdate.Type;

const PlanbareLeistungsart = Schema.Literal(...planbareLeistungsarten);

export const PreparationTemplateInput = Schema.Struct({
  kind: PlanbareLeistungsart,
  content: PreparationText,
});

export type PreparationTemplateInput = typeof PreparationTemplateInput.Type;
