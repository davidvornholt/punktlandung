/**
 * Produktionsserver: bedient die statischen Client-Assets aus dist/client
 * und reicht alles andere an den TanStack-Start-SSR-Handler weiter. Der von
 * `vite build` erzeugte Server-Entry (dist/server/server.js) exportiert nur
 * einen Fetch-Handler und liefert selbst keine statischen Dateien aus.
 */

import process from 'node:process';

import { parsePort } from './server-config.ts';
import { drainTimeoutMs, shutdown } from './server-shutdown.ts';

type StartServerEntry = {
  readonly default: {
    readonly fetch: (request: Request) => Promise<Response> | Response;
  };
};

const serverEntryUrl = new URL('../dist/server/server.js', import.meta.url);
const clientDirUrl = new URL('../dist/client/', import.meta.url);
const port = parsePort(Bun.env.PORT);

const { default: startServer } = (await import(
  serverEntryUrl.href
)) as StartServerEntry;

const immutableCache = 'public, max-age=31536000, immutable';

const serveStatic = async (pathname: string): Promise<Response | null> => {
  // Kein Pfadausbruch aus dist/client; Assets haben schlichte Pfade.
  if (pathname.includes('..') || pathname === '/') {
    return null;
  }
  const file = Bun.file(new URL(`.${pathname}`, clientDirUrl));
  if (!(await file.exists())) {
    return null;
  }
  const headers = pathname.startsWith('/assets/')
    ? { 'cache-control': immutableCache }
    : undefined;
  return new Response(file, { headers });
};

const server = Bun.serve({
  port,
  hostname: '0.0.0.0',
  fetch: async (request) => {
    const { pathname } = new URL(request.url);
    const staticValue = await serveStatic(pathname);
    return staticValue ?? startServer.fetch(request);
  },
});

await Bun.write(Bun.stdout, `Punktlandung läuft auf ${server.url}\n`);

// Der Container startet diesen Server über `bun run start`, das Podmans
// SIGTERM weiterreicht. Ohne Handler beendet das Signal diesen Prozess, und
// `bun run` stürzt als PID 1 beim Versuch ab, am selben Signal zu sterben:
// Exit 139, den die systemd-Unit des Slots als Fehlschlag wertet.
const stop = async () => {
  await shutdown(server, drainTimeoutMs);
  process.exit(0);
};
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
