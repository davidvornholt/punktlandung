import { Schema } from 'effect';

/*
 * Fehler des Befehls `punktlandung` selbst. Ihre Meldungen sind englisch, weil
 * Agenten sie lesen; Fehler aus den Features behalten Tag und deutsche Meldung.
 */

/** Die Befehlszeile ist kein Befehl; die Meldung sagt, warum. */
export class UsageError extends Schema.TaggedError<UsageError>()('UsageError', {
  message: Schema.String,
}) {}

/** Ein Argument passt zu keinem oder zu mehr als einem Datensatz. */
export class InvalidInput extends Schema.TaggedError<InvalidInput>()(
  'InvalidInput',
  { message: Schema.String },
) {}

/** Ohne angelegtes Halbjahr gibt es keine Noten und kein Zeugnis zu lesen. */
export class NoHalbjahr extends Schema.TaggedError<NoHalbjahr>()('NoHalbjahr', {
  message: Schema.String,
}) {}

/** Die Datenbank ist nicht erreichbar oder verweigert die Abfrage. */
export class DatabaseUnavailable extends Schema.TaggedError<DatabaseUnavailable>()(
  'DatabaseUnavailable',
  { message: Schema.String },
) {}
