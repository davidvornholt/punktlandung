import { Schema } from 'effect';

export class ZeugnisHalbjahrNotFound extends Schema.TaggedError<ZeugnisHalbjahrNotFound>()(
  'ZeugnisHalbjahrNichtGefunden',
  { termId: Schema.String },
) {
  override get message(): string {
    return `Für das Halbjahr ${this.termId} gibt es kein Zeugnis, weil es nicht existiert. Wähle ein vorhandenes Halbjahr.`;
  }
}
