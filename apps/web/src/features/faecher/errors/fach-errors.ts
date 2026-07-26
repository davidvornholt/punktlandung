import { Data } from 'effect';

export class FachSchoolYearNotFound extends Data.TaggedError(
  'FachSchoolYearNotFound',
)<{ readonly schoolYear: string }> {
  override get message(): string {
    return `Das Schuljahr ${this.schoolYear} existiert nicht. Lege zuerst ein Halbjahr dafür an.`;
  }
}

export class FachNotFound extends Data.TaggedError('FachNotFound')<{
  readonly fachId: string;
  readonly schoolYear: string;
}> {
  override get message(): string {
    return `Das Fach ${this.fachId} gehört nicht zum Schuljahr ${this.schoolYear}. Lade die Fachliste neu.`;
  }
}
