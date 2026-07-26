import { Data } from 'effect';

import type { Notensystem } from '#/shared/noten/notenwert.ts';

export class HalbjahrAlreadyExists extends Data.TaggedError(
  'HalbjahrAlreadyExists',
)<{ readonly schoolYear: string; readonly number: 1 | 2 }> {
  override get message(): string {
    return `Für ${this.schoolYear} existiert bereits das ${this.number}. Halbjahr. Bearbeite den vorhandenen Eintrag.`;
  }
}

export class HalbjahrNotFound extends Data.TaggedError('HalbjahrNotFound')<{
  readonly halbjahrId: string;
}> {
  override get message(): string {
    return `Das Halbjahr ${this.halbjahrId} existiert nicht mehr. Lade die Halbjahre neu.`;
  }
}

export class NotensystemImmutableWithNoten extends Data.TaggedError(
  'NotensystemImmutableWithNoten',
)<{
  readonly halbjahrId: string;
  readonly previous: Notensystem;
  readonly next: Notensystem;
}> {
  override get message(): string {
    return `Das Notensystem kann nicht von ${this.previous} auf ${this.next} geändert werden, weil bereits Noten eingetragen sind.`;
  }
}

export class SchoolYearImmutableWithNoten extends Data.TaggedError(
  'SchoolYearImmutableWithNoten',
)<{
  readonly halbjahrId: string;
  readonly previous: string;
  readonly next: string;
}> {
  override get message(): string {
    return `Das Schuljahr kann nicht von ${this.previous} auf ${this.next} geändert werden, weil bereits Noten eingetragen sind.`;
  }
}

export class HalbjahrExcludesNoten extends Data.TaggedError(
  'HalbjahrExcludesNoten',
)<{
  readonly halbjahrId: string;
  readonly startsOn: string;
  readonly endsOn: string;
}> {
  override get message(): string {
    return `Der Zeitraum ${this.startsOn} bis ${this.endsOn} schließt vorhandene Noten aus. Erweitere den Zeitraum oder verschiebe zuerst die betroffenen Noten.`;
  }
}
