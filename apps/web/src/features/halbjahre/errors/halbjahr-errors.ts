import { Schema } from 'effect';

import { notenCountText } from '#/shared/noten/noten-count-text.ts';
import { notensysteme } from '#/shared/noten/notenwert.ts';
import {
  klassenstufen,
  klassenstufeText,
} from '#/shared/school/klassenstufe.ts';

const Half = Schema.Literal(1, 2);
const Notensystem = Schema.Literal(...notensysteme);

export class HalbjahrAlreadyExists extends Schema.TaggedError<HalbjahrAlreadyExists>()(
  'HalbjahrBelegungDoppelt',
  { schoolYear: Schema.String, half: Half },
) {
  override get message(): string {
    return `Für ${this.schoolYear} existiert bereits das ${this.half}. Halbjahr. Bearbeite den vorhandenen Eintrag.`;
  }
}

const OtherHalbjahr = Schema.Struct({
  schoolYear: Schema.String,
  half: Half,
  klassenstufe: Schema.Literal(...klassenstufen),
});

/** Gemeinsamer Text für die Formularprüfung und die Ablehnung beim Speichern. */
export const klassenstufeConflictText = (
  other: typeof OtherHalbjahr.Type,
): string => {
  const klassenstufe = klassenstufeText(other.klassenstufe);
  return `Das ${other.half}. Halbjahr ${other.schoolYear} gehört zur ${klassenstufe}. Beide Halbjahre eines Schuljahrs haben dieselbe Klassenstufe; wähle auch hier ${klassenstufe}.`;
};

/** Trägt das vorhandene andere Halbjahr des Schuljahrs. */
export class KlassenstufeDiffersInSchoolYear extends Schema.TaggedError<KlassenstufeDiffersInSchoolYear>()(
  'KlassenstufeDiffersInSchoolYear',
  OtherHalbjahr,
) {
  override get message(): string {
    return klassenstufeConflictText(this);
  }
}

/**
 * Die Korrektur der Klassenstufe würde das Notensystem des anderen Halbjahrs
 * wechseln, in dem schon Noten stehen. Trägt dieses andere Halbjahr und die
 * gewünschte Klassenstufe.
 */
export class KlassenstufeCorrectionBlockedByNoten extends Schema.TaggedError<KlassenstufeCorrectionBlockedByNoten>()(
  'KlassenstufeCorrectionBlockedByNoten',
  OtherHalbjahr,
) {
  override get message(): string {
    return `Im ${this.half}. Halbjahr ${this.schoolYear} sind schon Noten eingetragen. Die Klassenstufe gilt für beide Halbjahre; mit ${klassenstufeText(this.klassenstufe)} würde sich auch dort das Notensystem ändern. Lösche zuerst diese Noten oder behalte die Klassenstufe.`;
  }
}

export class HalbjahrNotFound extends Schema.TaggedError<HalbjahrNotFound>()(
  'HalbjahrNichtGefunden',
  { halbjahrId: Schema.String },
) {
  override get message(): string {
    return `Das Halbjahr ${this.halbjahrId} existiert nicht mehr. Lade die Halbjahre neu.`;
  }
}

export class HalbjahrDeletionBlockedByNoten extends Schema.TaggedError<HalbjahrDeletionBlockedByNoten>()(
  'HalbjahrDeletionBlockedByNoten',
  { halbjahrId: Schema.String, notenCount: Schema.Number },
) {
  override get message(): string {
    return `Das Halbjahr enthält noch ${notenCountText(this.notenCount)} und kann deshalb nicht gelöscht werden. Lösche zuerst die Noten.`;
  }
}

export class HalbjahrDeletionConsequenceChanged extends Schema.TaggedError<HalbjahrDeletionConsequenceChanged>()(
  'HalbjahrDeletionConsequenceChanged',
  {
    halbjahrId: Schema.String,
    expectedFinalInSchoolYear: Schema.Boolean,
    actualFinalInSchoolYear: Schema.Boolean,
  },
) {
  override get message(): string {
    return this.actualFinalInSchoolYear
      ? 'Das Halbjahr ist inzwischen das letzte Halbjahr dieses Schuljahrs. Beim Löschen würden nun auch die konfigurierten Fächer zurückgesetzt. Prüfe die aktualisierte Warnung und bestätige erneut.'
      : 'Das Halbjahr ist inzwischen nicht mehr das letzte Halbjahr dieses Schuljahrs. Prüfe die aktualisierte Warnung und bestätige erneut.';
  }
}

export class NotensystemImmutableWithNoten extends Schema.TaggedError<NotensystemImmutableWithNoten>()(
  'NotensystemMitNotenUnveraenderlich',
  { halbjahrId: Schema.String, previous: Notensystem, next: Notensystem },
) {
  override get message(): string {
    return `Das Notensystem kann nicht von ${this.previous} auf ${this.next} geändert werden, weil bereits Noten eingetragen sind.`;
  }
}

export class SchoolYearImmutableWithNoten extends Schema.TaggedError<SchoolYearImmutableWithNoten>()(
  'SchuljahrMitNotenUnveraenderlich',
  { halbjahrId: Schema.String, previous: Schema.String, next: Schema.String },
) {
  override get message(): string {
    return `Das Schuljahr kann nicht von ${this.previous} auf ${this.next} geändert werden, weil bereits Noten eingetragen sind.`;
  }
}

export class HalbjahrExcludesNoten extends Schema.TaggedError<HalbjahrExcludesNoten>()(
  'HalbjahrSchliesstNotenAus',
  { halbjahrId: Schema.String, startsOn: Schema.String, endsOn: Schema.String },
) {
  override get message(): string {
    return `Der Zeitraum ${this.startsOn} bis ${this.endsOn} schließt vorhandene Noten aus. Erweitere den Zeitraum oder verschiebe zuerst die betroffenen Noten.`;
  }
}
