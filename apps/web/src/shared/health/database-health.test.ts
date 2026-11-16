import { afterEach, describe, expect, it } from 'bun:test';
import { listen, type TCPSocketListener } from 'bun';
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
