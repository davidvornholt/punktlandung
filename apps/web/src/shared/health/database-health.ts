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
 * Der Timeout hier sorgt nur dafür, dass der Check aufräumt; Aufrufer hören
 * über `boundedAt` zur selben Frist auf zu warten.
 */
export const databaseAnswers = Effect.gen(function* () {
  const sql = yield* SqlClient;
  yield* sql`select 1`;
}).pipe(
  Effect.timeoutOption(databaseHealthDeadlineMs),
  Effect.flatMap(
    Option.match({
      // Den Timeout meldet der Aufrufer, sobald er nicht mehr wartet.
      onNone: () => Effect.succeed(false),
      onSome: () => Effect.succeed(true),
    }),
  ),
  Effect.catchCause(() => logUnavailable('error').pipe(Effect.as(false))),
);

/**
 * Hört zur Frist auf, auf einen Check zu warten. Der Timeout des Checks kann
 * das nicht leisten: Wer eine Abfrage unterbricht, die die Datenbank nie
 * beantwortet, wartet auf den Abbruch durch den Treiber, und der dauert
 * mehrere Sekunden. Daher ist die Antwort hier begrenzt, und der Check räumt
 * im Hintergrund auf.
 */
const boundedAt = (
  work: Promise<boolean>,
  onTimeout: () => void,
): Promise<boolean> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      onTimeout();
      resolve(false);
    }, databaseHealthDeadlineMs);
    work.then(resolve, () => resolve(false)).finally(() => {
      clearTimeout(timer);
    });
  });

/**
 * Gleichzeitige Aufrufe teilen sich eine Abfrage, damit die öffentliche Route
 * den kleinen Verbindungspool der App nicht mit Health-Abfragen füllen kann.
 * Der Check bleibt geteilt, bis er aufgeräumt hat, auch wenn Aufrufer nicht
 * mehr auf ihn warten. So staut eine hängende Datenbank keine Abfragen auf.
 */
export const makeDatabaseCheck = (
  run: (check: typeof databaseAnswers) => Promise<boolean>,
): (() => Promise<boolean>) => {
  let inFlight: { work: Promise<boolean>; timeoutLogged: boolean } | undefined;
  return () => {
    const check = (inFlight ??= {
      work: run(databaseAnswers)
        .catch(() => false)
        .finally(() => {
          inFlight = undefined;
        }),
      timeoutLogged: false,
    });
    return boundedAt(check.work, () => {
      if (!check.timeoutLogged) {
        check.timeoutLogged = true;
        Effect.runSync(logUnavailable('timeout'));
      }
    });
  };
};
