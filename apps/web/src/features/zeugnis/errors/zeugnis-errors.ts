import { Data } from 'effect';

export class ZeugnisHalbjahrNichtGefunden extends Data.TaggedError(
  'ZeugnisHalbjahrNichtGefunden',
)<{
  readonly termId: string;
}> {
  override get message(): string {
    return `Für das Halbjahr ${this.termId} gibt es kein Zeugnis, weil es nicht existiert. Wähle ein vorhandenes Halbjahr.`;
  }
}
