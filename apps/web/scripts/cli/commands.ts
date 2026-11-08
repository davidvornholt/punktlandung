import { Effect, type Layer, Option } from 'effect';
import { Command, Flag } from 'effect/cli';
import type { SqlError } from 'effect/sql/SqlError';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import type { PgDrizzle } from '#/shared/db/pg-drizzle.ts';
import { DatabaseUnavailable } from './errors/cli-errors.ts';
import { emit } from './output.ts';
import { readHalbjahre, readNoten, readZeugnis } from './reads.ts';

/** Die Datenbank, die ein Befehl erst nach dem Lesen seiner Argumente öffnet. */
export type Database = Layer.Layer<PgDrizzle, DatabaseUnavailable | SqlError>;

// Jeder Befehl gibt JSON aus. `--json` wird trotzdem angenommen, damit Agenten
// es wie bei anderen Befehlen anhängen können.
const json = Flag.Boolean('json').pipe(
  Flag.withDescription('Print JSON. Every command does, with or without it.'),
  Flag.withDefault(false),
);

// Wie `Flag.optional`, aber ein wiederholtes Flag ist ein Fehler, statt dass
// still das erste gilt.
const halbjahr = Flag.String('halbjahr').pipe(
  Flag.withDescription(
    'The Halbjahr, by id or by label such as 10.2 or J1.1. Defaults to the one the app shows: the current Halbjahr, else the last one begun, else the next one.',
  ),
  Flag.atMost(1),
  Flag.map((values) => Option.fromUndefinedOr(values[0])),
);

export const makeCli = (database: Database) => {
  // Die Datenbank wird erst hier geöffnet, sodass `--help` und Fehler in den
  // Argumenten sie nie berühren.
  const read = <A, E>(query: Effect.Effect<A, E, PgDrizzle>) =>
    query.pipe(
      Effect.provide(database),
      Effect.catchTag('SqlError', () =>
        Effect.fail(
          new DatabaseUnavailable({
            message: "Punktlandung's database could not be read.",
          }),
        ),
      ),
      Effect.flatMap(emit),
    );

  const halbjahre = Command.make('halbjahre').pipe(
    Command.withDescription('Read the Halbjahre'),
    Command.withSubcommands([
      Command.make('list', {}, () =>
        read(readHalbjahre(berlinCalendarDate())),
      ).pipe(
        Command.withDescription(
          'List every Halbjahr, the latest first, with how many Noten it has and which one the other commands read by default',
        ),
      ),
    ]),
  );

  const noten = Command.make('noten').pipe(
    Command.withDescription('Read the Noten'),
    Command.withSubcommands([
      Command.make('list', { halbjahr }, ({ halbjahr: choice }) =>
        read(readNoten(choice, berlinCalendarDate())),
      ).pipe(
        Command.withDescription(
          "List a Halbjahr's Fächer with their Gewichtung and its graded and planned Leistungen, the latest first",
        ),
      ),
    ]),
  );

  const zeugnis = Command.make(
    'zeugnis',
    { halbjahr },
    ({ halbjahr: choice }) => read(readZeugnis(choice, berlinCalendarDate())),
  ).pipe(
    Command.withDescription(
      "Show a Halbjahr's Zeugnis as the app computes it: each Fach's Note and the Gesamtschnitt, and a preview of the Jahresnoten once a school year graded 1 to 6 has both Halbjahre",
    ),
  );

  return Command.make('punktlandung').pipe(
    Command.withSharedFlags({ json }),
    Command.withDescription(
      "Read Punktlandung's Halbjahre, Fächer, Noten and Zeugnisse. Read-only; prints JSON.",
    ),
    Command.withSubcommands([halbjahre, noten, zeugnis]),
  );
};
