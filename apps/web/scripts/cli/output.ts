import process from 'node:process';
import { Effect } from 'effect';

/*
 * stdout trägt Punktlandungs Daten als JSON, stderr Fehler als JSON. Eingerückt
 * nur am Terminal, damit Agenten kompakte Ausgabe lesen.
 */

const writeJson = (stream: NodeJS.WriteStream, value: unknown): void => {
  stream.write(
    `${JSON.stringify(value, null, stream.isTTY === true ? 2 : undefined)}\n`,
  );
};

export const emit = (value: unknown): Effect.Effect<void> =>
  Effect.sync(() => writeJson(process.stdout, value));

export const failureExitCode = 1;
export const usageExitCode = 2;

export type ReportedError = {
  readonly _tag: string;
  readonly message: string;
};

/** Fehler in den Argumenten selbst, im Unterschied zu Daten oder Verbindung. */
const invalidInputTags = new Set(['InvalidInput', 'UsageError']);

export const report = (error: ReportedError): Effect.Effect<void> =>
  Effect.sync(() => {
    writeJson(process.stderr, {
      error: { tag: error._tag, message: error.message },
    });
    process.exitCode = invalidInputTags.has(error._tag)
      ? usageExitCode
      : failureExitCode;
  });
