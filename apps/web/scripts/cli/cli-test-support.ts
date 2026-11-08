import process from 'node:process';

export type CliResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
};

type CliEnvironment = {
  readonly databaseUrl?: string;
  /** Die Befehlszeile, wie die SSH-Tür sie durchreicht. */
  readonly sshOriginalCommand?: string;
};

/**
 * Startet den echten Einstiegspunkt, denn erst dort entscheidet sich, was auf
 * stdout und stderr landet. Aus der Umgebung des Testlaufs kommt nichts mit.
 */
export const runPunktlandung = async (
  args: ReadonlyArray<string>,
  { databaseUrl, sshOriginalCommand }: CliEnvironment = {},
): Promise<CliResult> => {
  // Aus Einträgen gebaut, weil Namen von Umgebungsvariablen nicht camelCase sind.
  const env = Object.fromEntries(
    [
      ['NO_COLOR', '1'],
      ['DATABASE_URL', databaseUrl],
      ['SSH_ORIGINAL_COMMAND', sshOriginalCommand],
    ].filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  const child = Bun.spawn(
    [process.execPath, new URL('../cli.ts', import.meta.url).pathname, ...args],
    { env, stdout: 'pipe', stderr: 'pipe' },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, exitCode };
};
