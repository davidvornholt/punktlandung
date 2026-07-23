import { Data } from 'effect';

export class FachSchuljahrNichtGefunden extends Data.TaggedError(
  'FachSchuljahrNichtGefunden',
)<{ readonly schoolYear: string }> {
  override get message(): string {
    return `Das Schuljahr ${this.schoolYear} existiert nicht. Lege zuerst ein Halbjahr dafür an.`;
  }
}

export class FachNichtGefunden extends Data.TaggedError('FachNichtGefunden')<{
  readonly fachId: string;
  readonly schoolYear: string;
}> {
  override get message(): string {
    return `Das Fach ${this.fachId} gehört nicht zum Schuljahr ${this.schoolYear}. Lade die Fachliste neu.`;
  }
}
