import { Data } from 'effect';

import type { Notensystem } from '#/shared/noten/notenwert.ts';

export class HalbjahrNotFound extends Data.TaggedError('HalbjahrNotFound')<{
  readonly halbjahrId: string;
}> {
  override get message(): string {
    return `Das Halbjahr ${this.halbjahrId} existiert nicht. Lege es unter Einstellungen an oder wähle ein vorhandenes.`;
  }
}

export class NoteNotFound extends Data.TaggedError('NoteNotFound')<{
  readonly noteId: string;
}> {
  override get message(): string {
    return `Die Note ${this.noteId} existiert nicht mehr. Lade die Notenliste neu.`;
  }
}

export class InvalidNotenwert extends Data.TaggedError('InvalidNotenwert')<{
  readonly value: number;
  readonly notensystem: Notensystem;
}> {
  override get message(): string {
    return this.notensystem === 'punkte'
      ? `${this.value} ist kein gültiger Wert: Notenpunkte sind ganze Zahlen von 0 bis 15.`
      : `${this.value} ist kein gültiger Wert: Noten liegen zwischen 1,00 und 6,00.`;
  }
}

export class NoteOutsideHalbjahr extends Data.TaggedError(
  'NoteOutsideHalbjahr',
)<{
  readonly date: string;
  readonly startsOn: string;
  readonly endsOn: string;
}> {
  override get message(): string {
    return `Das Notendatum ${this.date} liegt nicht im Halbjahr vom ${this.startsOn} bis ${this.endsOn}.`;
  }
}

export class FachNotInSchoolYear extends Data.TaggedError(
  'FachNotInSchoolYear',
)<{ readonly fachId: string; readonly schoolYear: string }> {
  override get message(): string {
    return `Das Fach ${this.fachId} gehört nicht zum Schuljahr ${this.schoolYear}. Wähle ein Fach aus diesem Schuljahr.`;
  }
}
