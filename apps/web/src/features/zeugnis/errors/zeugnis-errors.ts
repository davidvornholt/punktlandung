import { Data } from 'effect';

export class ZeugnisHalbjahrNotFound extends Data.TaggedError(
  'ZeugnisHalbjahrNotFound',
)<{
  readonly halbjahrId: string;
}> {
  override get message(): string {
    return `Für das Halbjahr ${this.halbjahrId} gibt es kein Zeugnis, weil es nicht existiert. Wähle ein vorhandenes Halbjahr.`;
  }
}
