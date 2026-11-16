import { afterEach, describe, expect, it } from 'bun:test';
import { listen, sleep, type TCPSocketListener } from 'bun';
import { Effect } from 'effect';

import { databaseLayer } from '#/shared/db/database-layer.ts';
import {
  databaseHealthDeadlineMs,
  makeDatabaseCheck,
} from './database-health.ts';

const listeners = new Set<TCPSocketListener>();

// Ein Server, der jede Verbindung annimmt und nie antwortet.
const listenSilently = (onConnect: () => void): number => {
  const listener = listen({
    hostname: '127.0.0.1',
    port: 0,
    socket: { open: onConnect, data: () => undefined },
  });
  listeners.add(listener);
  return listener.port;
};

afterEach(() => {
  for (const listener of listeners) {
    listener.stop(true);
  }
  listeners.clear();
});

const be32 = (value: number): Uint8Array =>
  new Uint8Array([
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ]);

const message = (type: string, ...body: ReadonlyArray<Uint8Array>) => {
  const length = 4 + body.reduce((sum, part) => sum + part.length, 0);
  return Uint8Array.from([
    type.charCodeAt(0),
    ...be32(length),
    ...body.flatMap((part) => [...part]),
  ]);
};

const cancelRequestCode = 80_877_102;

type HangingServer = {
  readonly open: () => number;
  readonly port: number;
  readonly queries: () => number;
  readonly startups: () => number;
};

// Ein Server, der den PostgreSQL-Handshake abschließt, nie eine Abfrage
// beantwortet und Abbruchanfragen ignoriert, wie eine hängende Datenbank.
const listenHandshakeOnly = (): HangingServer => {
  let open = 0;
  let queries = 0;
  let startups = 0;
  const started = new WeakSet<object>();
  const listener = listen({
    hostname: '127.0.0.1',
    port: 0,
    socket: {
      open: () => {
        open += 1;
      },
      close: () => {
        open -= 1;
      },
      data: (socket, data) => {
        if (!started.has(socket)) {
          started.add(socket);
          const code = new DataView(
            data.buffer,
            data.byteOffset,
            data.byteLength,
          ).getUint32(4);
          if (code === cancelRequestCode) {
            return;
          }
          startups += 1;
          socket.write(message('R', be32(0)));
          socket.write(message('K', be32(1), be32(2)));
          socket.write(message('Z', new Uint8Array([73])));
          return;
        }
        if (data[0] === 81 || data[0] === 80) {
          queries += 1;
        }
      },
    },
  });
  listeners.add(listener);
  return {
    open: () => open,
    port: listener.port,
    queries: () => queries,
    startups: () => startups,
  };
};

const urlFor = (port: number) =>
  `postgresql://app:app@127.0.0.1:${port}/app?sslmode=disable`;

const checkAgainst = (url: string, runs: { count: number } = { count: 0 }) =>
  makeDatabaseCheck((check) => {
    runs.count += 1;
    return Effect.runPromise(check.pipe(Effect.provide(databaseLayer(url))));
  });

describe('Health-Check der Datenbank', () => {
  it('meldet zur Frist nicht verfügbar, wenn die Datenbank die Verbindung annimmt und nie antwortet', async () => {
    let connections = 0;
    const port = listenSilently(() => {
      connections += 1;
    });
    const runs = { count: 0 };
    const check = checkAgainst(urlFor(port), runs);
    const startedAt = performance.now();

    const answers = await Promise.all([check(), check(), check()]);
    const elapsed = performance.now() - startedAt;

    expect(answers).toEqual([false, false, false]);
    expect(elapsed).toBeGreaterThanOrEqual(databaseHealthDeadlineMs - 100);
    expect(elapsed).toBeLessThan(databaseHealthDeadlineMs + 500);
    expect(runs.count).toBe(1);
    expect(connections).toBe(1);
  });

  it('meldet zur Frist nicht verfügbar, wenn die Datenbank den Login annimmt und die Abfrage nie beantwortet', async () => {
    const server = listenHandshakeOnly();
    const runs = { count: 0 };
    const check = checkAgainst(urlFor(server.port), runs);
    const startedAt = performance.now();

    const answers = await Promise.all([check(), check(), check()]);
    const elapsed = performance.now() - startedAt;

    expect(answers).toEqual([false, false, false]);
    expect(elapsed).toBeGreaterThanOrEqual(databaseHealthDeadlineMs - 100);
    expect(elapsed).toBeLessThan(databaseHealthDeadlineMs + 500);
    expect(runs.count).toBe(1);
    expect(server.queries()).toBe(1);
  });

  it('schließt die Verbindung nach einer hängenden Abfrage und fragt danach erneut', async () => {
    const server = listenHandshakeOnly();
    const runs = { count: 0 };
    const check = checkAgainst(urlFor(server.port), runs);

    await check();
    const deadline = performance.now() + 15_000;
    while (server.open() > 0 && performance.now() < deadline) {
      await sleep(100);
    }
    expect(server.open()).toBe(0);

    await check();
    expect(runs.count).toBe(2);
  }, 30_000);

  it('meldet sofort nicht verfügbar, wenn niemand lauscht', async () => {
    const listener = listen({
      hostname: '127.0.0.1',
      port: 0,
      socket: { data: () => undefined },
    });
    const { port } = listener;
    listener.stop(true);

    expect(await checkAgainst(urlFor(port))()).toBe(false);
  });

  it('fragt nach einem Fehlschlag erneut, statt ihn sich zu merken', async () => {
    const runs = { count: 0 };
    const port = listenSilently(() => undefined);
    const check = checkAgainst(urlFor(port), runs);

    await check();
    await check();

    expect(runs.count).toBe(2);
  });
});
