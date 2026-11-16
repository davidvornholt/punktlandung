import { Effect, Option } from 'effect';
import { SqlClient } from 'effect/sql/SqlClient';

/**
 * Der Start-Check des Hosts und der Docker-Healthcheck geben jeder Anfrage
 * fünf Sekunden. Die Antwort muss deutlich davor kommen, ob die Datenbank
 * nun ausgefallen ist oder nur langsam antwortet.
 */
export const databaseHealthDeadlineMs = 1500;

type DatabaseUnavailableReason = 'error' | 'timeout';
type DatabaseState = 'available' | DatabaseUnavailableReason;

type InFlightCheck = {
  readonly state: Promise<DatabaseState>;
  reported: boolean;
};

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
  Effect.map(
    Option.match({
      onNone: (): DatabaseState => 'timeout',
      onSome: (): DatabaseState => 'available',
    }),
  ),
  Effect.catchCause(() => Effect.succeed<DatabaseState>('error')),
);

/**
 * Hört zur Frist auf, auf einen Check zu warten. Der Timeout des Checks kann
 * das nicht leisten: Wer eine Abfrage unterbricht, die die Datenbank nie
 * beantwortet, wartet auf den Abbruch durch den Treiber, und der dauert
 * mehrere Sekunden. Daher ist die Antwort hier begrenzt, und der Check räumt
 * im Hintergrund auf.
 */
// Meldet den Grund einmal je Check, egal ob der Check oder sein Aufrufer ihn zuerst sieht.
const report = (check: InFlightCheck, reason: DatabaseUnavailableReason) => {
  if (!check.reported) {
    check.reported = true;
    Effect.runSync(logUnavailable(reason));
  }
};

const boundedAt = (check: InFlightCheck): Promise<boolean> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      report(check, 'timeout');
      resolve(false);
    }, databaseHealthDeadlineMs);
    check.state
      .then(
        (state) => resolve(state === 'available'),
        () => resolve(false),
      )
      .finally(() => {
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
  run: (check: typeof databaseAnswers) => Promise<DatabaseState>,
): (() => Promise<boolean>) => {
  let inFlight: InFlightCheck | undefined;
  return () => {
    if (inFlight === undefined) {
      const check: InFlightCheck = {
        reported: false,
        state: run(databaseAnswers)
          .catch((): DatabaseState => 'error')
          .finally(() => {
            inFlight = undefined;
          }),
      };
      check.state.then(
        (state) => {
          if (state !== 'available') {
            report(check, state);
          }
        },
        () => undefined,
      );
      inFlight = check;
    }
    return boundedAt(inFlight);
  };
};
