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
  maxSubmissionIdLength: 64,
} as const;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

const Leistungsart = Schema.Literals(leistungsarten);

export const NotenFields = Schema.Struct({
  subjectId: Schema.String,
  kind: Leistungsart,
  /**
   * Nativer Wert; die Systemprüfung übernimmt der Service anhand des
   * Halbjahrs. null legt die Leistung als ausstehend an — der Service lässt
   * das nur für planbare Leistungsarten zu.
   */
  wert: Schema.NullOr(Schema.Number),
  gewicht: Schema.Number.check(
    Schema.isGreaterThan(0),
    Schema.isLessThanOrEqualTo(notenLimits.maxGewichtung),
  ),
  datum: Schema.String.check(Schema.isPattern(isoDatePattern)),
  notiz: Schema.NullOr(Schema.String),
});

export type NotenFields = typeof NotenFields.Type;

export const NoteInput = Schema.Struct({
  /**
   * Die Identität dieser Abgabe, vom Formular erzeugt und bei jedem erneuten
   * Versuch derselben Abgabe unverändert. Sie wird zur ID der Note, damit ein
   * Wiederholungsversuch nach einer verlorenen Antwort keine zweite anlegt.
   */
  id: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(notenLimits.maxSubmissionIdLength),
  ),
  termId: Schema.String,
  ...NotenFields.fields,
});

export type NoteInput = typeof NoteInput.Type;

/**
 * Die Anfrage des Notenformulars. Ein Tab, der vor der Einführung der
 * Abgabe-ID geladen wurde, sendet keine `id`. Fehlte sie schon der
 * Schemaprüfung, bekäme er nur den allgemeinen Verbindungsfehler; so erreicht
 * ihn die Aufforderung, die Seite neu zu laden. Der Server erfindet keine ID,
 * weil ein Wiederholungsversuch sie nicht kennen könnte.
 */
export const NoteSubmission = Schema.Struct({
  ...NoteInput.fields,
  id: Schema.optionalKey(NoteInput.fields.id),
});
export type NoteSubmission = typeof NoteSubmission.Type;

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

const PreparationText = Schema.String.check(
  Schema.isMaxLength(preparationLimits.maxLength),
);

export const PreparationUpdate = Schema.Struct({
  id: Schema.String,
  /**
   * Der Stand, auf dem die Änderung beruht. Steht inzwischen ein anderer
   * gespeichert, etwa aus einem zweiten Tab, wird nichts überschrieben.
   */
  expected: Schema.NullOr(PreparationText),
  /** null löscht die Vorbereitung. */
  preparation: Schema.NullOr(PreparationText),
});

export type PreparationUpdate = typeof PreparationUpdate.Type;

const PlanbareLeistungsart = Schema.Literals(planbareLeistungsarten);

export const PreparationTemplateInput = Schema.Struct({
  kind: PlanbareLeistungsart,
  content: PreparationText,
});

export type PreparationTemplateInput = typeof PreparationTemplateInput.Type;
