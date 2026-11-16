import { Effect, Option } from 'effect';
import { SqlClient } from 'effect/sql/SqlClient';

/**
 * Der Start-Check des Hosts und der Docker-Healthcheck geben jeder Anfrage
 * fünf Sekunden. Die Antwort muss deutlich davor kommen, ob die Datenbank
 * nun ausgefallen ist oder nur langsam antwortet.
 */
export const databaseHealthDeadlineMs = 1500;

type DatabaseUnavailableReason = 'error' | 'timeout';

// Nur der Grund, keine Fehlermeldung: sie kann Verbindungsdaten enthalten.
const logUnavailable = (reason: DatabaseUnavailableReason) =>
  Effect.logWarning(`Health-Check: Datenbank nicht verfügbar (${reason})`);

/**
 * Fragt über den SqlClient der App, wie es jede Abfrage der App tut. Der Pool
 * baut nach einem Ausfall selbst neue Verbindungen auf, daher meldet sich die
 * App ohne Neustart wieder gesund. Eine eigene Verbindung nur für den Check
 * würde das Verbindungsbudget der Preview-Rolle (`database-layer.ts`) sprengen.
 */
export const databaseAnswers = Effect.gen(function* () {
  const sql = yield* SqlClient;
  yield* sql`select 1`;
}).pipe(
  Effect.timeoutOption(databaseHealthDeadlineMs),
  Effect.flatMap(
    Option.match({
      onNone: () => logUnavailable('timeout').pipe(Effect.as(false)),
      onSome: () => Effect.succeed(true),
    }),
  ),
  Effect.catchCause(() => logUnavailable('error').pipe(Effect.as(false))),
);

/**
 * Gleichzeitige Aufrufe teilen sich eine Abfrage, damit die öffentliche Route
 * den kleinen Verbindungspool der App nicht mit Health-Abfragen füllen kann.
 */
export const makeDatabaseCheck = (
  run: (check: typeof databaseAnswers) => Promise<boolean>,
): (() => Promise<boolean>) => {
  let inFlight: Promise<boolean> | undefined;
  return () => {
    inFlight ??= run(databaseAnswers).finally(() => {
      inFlight = undefined;
    });
    return inFlight;
  };
};
