import { Schema } from 'effect';

export class FachSchoolYearNotFound extends Schema.TaggedError<FachSchoolYearNotFound>()(
  'FachSchuljahrNichtGefunden',
  { schoolYear: Schema.String },
) {
  override get message(): string {
    return `Das Schuljahr ${this.schoolYear} existiert nicht. Lege zuerst ein Halbjahr dafür an.`;
  }
}

export class FachNotFound extends Schema.TaggedError<FachNotFound>()(
  'FachNichtGefunden',
  { fachId: Schema.String, schoolYear: Schema.String },
) {
  override get message(): string {
    return `Das Fach ${this.fachId} gehört nicht zum Schuljahr ${this.schoolYear}. Lade die Fachliste neu.`;
  }
}
