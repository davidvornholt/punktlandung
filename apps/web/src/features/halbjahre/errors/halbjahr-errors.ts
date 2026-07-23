import { Data } from 'effect';

import type { Notensystem } from '#/shared/noten/notenwert.ts';

export class HalbjahrBelegungDoppelt extends Data.TaggedError(
  'HalbjahrBelegungDoppelt',
)<{ readonly schoolYear: string; readonly half: 1 | 2 }> {
  override get message(): string {
    return `Für ${this.schoolYear} existiert bereits das ${this.half}. Halbjahr. Bearbeite den vorhandenen Eintrag.`;
  }
}

export class HalbjahrNichtGefunden extends Data.TaggedError(
  'HalbjahrNichtGefunden',
)<{ readonly halbjahrId: string }> {
  override get message(): string {
    return `Das Halbjahr ${this.halbjahrId} existiert nicht mehr. Lade die Halbjahre neu.`;
  }
}

export class NotensystemMitNotenUnveraenderlich extends Data.TaggedError(
  'NotensystemMitNotenUnveraenderlich',
)<{
  readonly halbjahrId: string;
  readonly bisher: Notensystem;
  readonly neu: Notensystem;
}> {
  override get message(): string {
    return `Das Notensystem kann nicht von ${this.bisher} auf ${this.neu} geändert werden, weil bereits Noten eingetragen sind.`;
  }
}

export class SchuljahrMitNotenUnveraenderlich extends Data.TaggedError(
  'SchuljahrMitNotenUnveraenderlich',
)<{
  readonly halbjahrId: string;
  readonly bisher: string;
  readonly neu: string;
}> {
  override get message(): string {
    return `Das Schuljahr kann nicht von ${this.bisher} auf ${this.neu} geändert werden, weil bereits Noten eingetragen sind.`;
  }
}

export class HalbjahrSchliesstNotenAus extends Data.TaggedError(
  'HalbjahrSchliesstNotenAus',
)<{
  readonly halbjahrId: string;
  readonly startsOn: string;
  readonly endsOn: string;
}> {
  override get message(): string {
    return `Der Zeitraum ${this.startsOn} bis ${this.endsOn} schließt vorhandene Noten aus. Erweitere den Zeitraum oder verschiebe zuerst die betroffenen Noten.`;
  }
}
