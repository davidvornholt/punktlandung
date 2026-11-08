import { Effect, Layer } from 'effect';
import { databaseLayer } from '#/shared/db/database-layer.ts';
import { DatabaseUnavailable } from './cli/errors/cli-errors.ts';
import { runCli } from './cli/run-cli.ts';
import { splitShellWords } from './cli/shell-words.ts';

/*
 * `punktlandung`: liest Halbjahre, Fächer, Noten und Zeugnisse für Agenten.
 *
 * Auf prod-1 läuft der Befehl im Image des aktuellen Releases, gestartet von
 * der SSH-Tür `punktlandung-agent` aus personal-infra. Sie verbindet ihn als
 * Rolle `punktlandung_agent`, die nur diese Tabellen lesen darf, und reicht die
 * getippte Befehlszeile als `SSH_ORIGINAL_COMMAND` durch. Direkt gestartet
 * liest er seine Argumente.
 *
 * Daten stehen als JSON auf stdout, Fehler als `{"error":{"tag","message"}}`
 * auf stderr. `skills/punktlandung/SKILL.md` beschreibt den Befehl für Agenten.
 */

const line = Bun.env.SSH_ORIGINAL_COMMAND;
const words = line === undefined ? Bun.argv.slice(2) : splitShellWords(line);

const database = Layer.unwrap(
  Effect.suspend(() => {
    const url = Bun.env.DATABASE_URL;
    return url === undefined || url === ''
      ? Effect.fail(
          new DatabaseUnavailable({
            message:
              "DATABASE_URL is not set, so Punktlandung's database can't be reached.",
          }),
        )
      : Effect.succeed(databaseLayer(url));
  }),
);

await Effect.runPromise(runCli(words, database));
