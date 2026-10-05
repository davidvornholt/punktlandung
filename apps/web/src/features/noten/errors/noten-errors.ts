import { Schema } from 'effect';

import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import { leistungsarten, notensysteme } from '#/shared/noten/notenwert.ts';

export class HalbjahrNotFound extends Schema.TaggedError<HalbjahrNotFound>()(
  'HalbjahrNichtGefunden',
  { termId: Schema.String },
) {
  override get message(): string {
    return `Das Halbjahr ${this.termId} existiert nicht. Lege es unter Einstellungen an oder wähle ein vorhandenes.`;
  }
}

export class NoteNotFound extends Schema.TaggedError<NoteNotFound>()(
  'NoteNichtGefunden',
  { noteId: Schema.String },
) {
  override get message(): string {
    return `Die Note ${this.noteId} existiert nicht mehr. Lade die Notenliste neu.`;
  }
}

export class InvalidNotenwert extends Schema.TaggedError<InvalidNotenwert>()(
  'UngueltigerNotenwert',
  { wert: Schema.Number, system: Schema.Literal(...notensysteme) },
) {
  override get message(): string {
    return this.system === 'punkte'
      ? `${this.wert} ist kein gültiger Wert: Notenpunkte sind ganze Zahlen von 0 bis 15.`
      : `${this.wert} ist kein gültiger Wert: Noten liegen zwischen 1,00 und 6,00.`;
  }
}

export class NotenwertRequired extends Schema.TaggedError<NotenwertRequired>()(
  'NotenwertErforderlich',
  { kind: Schema.Literal(...leistungsarten) },
) {
  override get message(): string {
    return `${leistungsartLabel[this.kind]} hat keinen Termin und kann nicht ausstehen. Trage die Note ein oder wähle Klausur, Test oder GFS.`;
  }
}

export class NoteOutsideHalbjahr extends Schema.TaggedError<NoteOutsideHalbjahr>()(
  'NoteAusserhalbHalbjahr',
  { datum: Schema.String, startsOn: Schema.String, endsOn: Schema.String },
) {
  override get message(): string {
    return `Das Notendatum ${this.datum} liegt nicht im Halbjahr vom ${this.startsOn} bis ${this.endsOn}.`;
  }
}

export class FachNotInSchoolYear extends Schema.TaggedError<FachNotInSchoolYear>()(
  'FachNichtImSchuljahr',
  { fachId: Schema.String, schoolYear: Schema.String },
) {
  override get message(): string {
    return `Das Fach ${this.fachId} gehört nicht zum Schuljahr ${this.schoolYear}. Wähle ein Fach aus diesem Schuljahr.`;
  }
}
