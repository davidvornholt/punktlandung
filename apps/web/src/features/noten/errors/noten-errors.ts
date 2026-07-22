import { Data } from 'effect';

import type { Notensystem } from '#/shared/noten/notenwert.ts';

export class HalbjahrNichtGefunden extends Data.TaggedError(
  'HalbjahrNichtGefunden',
)<{
  readonly termId: string;
}> {
  override get message(): string {
    return `Das Halbjahr ${this.termId} existiert nicht. Lege es unter Einstellungen an oder wähle ein vorhandenes.`;
  }
}

export class NoteNichtGefunden extends Data.TaggedError('NoteNichtGefunden')<{
  readonly noteId: string;
}> {
  override get message(): string {
    return `Die Note ${this.noteId} existiert nicht mehr. Lade die Notenliste neu.`;
  }
}

export class UngueltigerNotenwert extends Data.TaggedError(
  'UngueltigerNotenwert',
)<{
  readonly wert: number;
  readonly system: Notensystem;
}> {
  override get message(): string {
    return this.system === 'punkte'
      ? `${this.wert} ist kein gültiger Wert: Notenpunkte sind ganze Zahlen von 0 bis 15.`
      : `${this.wert} ist kein gültiger Wert: Noten liegen zwischen 1,00 und 6,00.`;
  }
}

export class NoteAusserhalbHalbjahr extends Data.TaggedError(
  'NoteAusserhalbHalbjahr',
)<{
  readonly datum: string;
  readonly startsOn: string;
  readonly endsOn: string;
}> {
  override get message(): string {
    return `Das Notendatum ${this.datum} liegt nicht im Halbjahr vom ${this.startsOn} bis ${this.endsOn}.`;
  }
}

export class FachNichtImSchuljahr extends Data.TaggedError(
  'FachNichtImSchuljahr',
)<{ readonly fachId: string; readonly schoolYear: string }> {
  override get message(): string {
    return `Das Fach ${this.fachId} gehört nicht zum Schuljahr ${this.schoolYear}. Wähle ein Fach aus diesem Schuljahr.`;
  }
}
