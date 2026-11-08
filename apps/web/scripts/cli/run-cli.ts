import { BunServices } from '@effect/platform-bun';
import { Console, Effect, References } from 'effect';
import { CliError, CliOutput, Command } from 'effect/cli';
import packageJson from '../../package.json' with { type: 'json' };
import { type Database, makeCli } from './commands.ts';
import { UsageError } from './errors/cli-errors.ts';
import { report } from './output.ts';

/*
 * Die CLI-Bibliothek schreibt bei einem Fehler in den Argumenten die Hilfe des
 * Befehls auf stdout, bevor sie scheitert. Agenten lesen stdout als Daten,
 * deshalb wird die Hilfe zurückgehalten und nur ausgegeben, wenn sie verlangt
 * war: mit --help oder durch eine Befehlsgruppe ohne Unterbefehl. Alles andere,
 * etwa die Version, geht direkt durch. Ein Fehler in den Argumenten wird wie
 * jeder andere Fehler ein JSON-Objekt auf stderr, sodass Agenten nur eine Form
 * lesen.
 */
export const runCli = (
  words: ReadonlyArray<string> | UsageError,
  database: Database,
) =>
  Effect.gen(function* () {
    if (words instanceof UsageError) {
      return yield* words;
    }
    const stdout = yield* Console.Console;
    const formatter = yield* CliOutput.Formatter;
    let help: string | undefined;
    let heldHelp: string | undefined;
    const printHeldHelp = Effect.suspend(() =>
      heldHelp === undefined ? Effect.void : Console.log(heldHelp),
    );
    return yield* Command.runWith(makeCli(database), {
      version: packageJson.version,
      renderErrors: false,
    })(words).pipe(
      Effect.provideService(CliOutput.Formatter, {
        ...formatter,
        formatHelpDoc: (doc) => {
          help = formatter.formatHelpDoc(doc);
          return help;
        },
      }),
      Effect.provideService(Console.Console, {
        ...stdout,
        log: (...args) => {
          if (args.length === 1 && args[0] === help) {
            heldHelp = help;
          } else {
            stdout.log(...args);
          }
        },
      }),
      Effect.andThen(printHeldHelp),
      Effect.catchTag('ShowHelp', (shown) =>
        shown.errors.length === 0
          ? printHeldHelp
          : Effect.fail(
              new UsageError({
                message: shown.errors.map((error) => error.message).join('\n'),
              }),
            ),
      ),
    );
  }).pipe(
    Effect.catch((error) =>
      report(
        CliError.isCliError(error)
          ? { _tag: 'UsageError', message: error.message }
          : error,
      ),
    ),
    Effect.catchDefect((defect) =>
      report({ _tag: 'UnexpectedError', message: String(defect) }),
    ),
    // Logs gingen auf stdout und brächen das JSON.
    Effect.provideService(References.MinimumLogLevel, 'None'),
    Effect.provide(BunServices.layer),
  );
