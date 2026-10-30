import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { shutdown } from './server-shutdown.ts';

const drainMs = 5000;
const appDir = join(import.meta.dir, '..');
const portVariable = 'PORT';
// Bun.env's type carries Vite's boolean DEV, PROD and SSR flags; a child's
// environment is strings.
const parentEnv = Bun.env as Record<string, string | undefined>;
// Larger than the socket buffers, so the server is still writing it to a
// client that has stopped reading.
const largeFileBytes = 64 * 1024 * 1024;
const settleMs = 200;

let sandbox = '';

beforeAll(async () => {
  // serve.ts finds dist next to its own directory, as in the image, so the
  // sandbox holds copies of the scripts beside a stand-in build.
  sandbox = await mkdtemp(join(tmpdir(), 'punktlandung-serve-'));
  await mkdir(join(sandbox, 'dist', 'client'), { recursive: true });
  await Bun.write(
    join(sandbox, 'dist', 'server', 'server.js'),
    "export default { fetch: () => new Response('ssr') };\n",
  );
  await Promise.all(
    ['serve.ts', 'server-config.ts', 'server-shutdown.ts'].map((script) =>
      Bun.write(
        join(sandbox, 'scripts', script),
        Bun.file(join(import.meta.dir, script)),
      ),
    ),
  );
  await symlink(join(appDir, 'node_modules'), join(sandbox, 'node_modules'));
});

afterAll(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

describe('shutdown', () => {
  it('answers the request in flight before the server stops', async () => {
    const { promise: answer, resolve } = Promise.withResolvers<void>();
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: async () => {
        await answer;
        return new Response('answered');
      },
    });
    const inFlight = fetch(server.url).then((response) => response.text());
    await Bun.sleep(50);

    const stopped = shutdown(server, drainMs);
    resolve();

    expect(await inFlight).toBe('answered');
    await stopped;
  });
});

describe('the server process', () => {
  it('finishes the response in flight when stopped twice', async () => {
    await Bun.write(
      join(sandbox, 'dist', 'client', 'large.bin'),
      new Uint8Array(largeFileBytes),
    );
    const probe = Bun.serve({ port: 0, fetch: () => new Response() });
    const { port } = probe.url;
    await probe.stop(true);
    const child = Bun.spawn(['bun', join(sandbox, 'scripts', 'serve.ts')], {
      env: { ...parentEnv, [portVariable]: port },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    let client: Bun.Socket | undefined;
    try {
      const reader = child.stdout.getReader();
      const { value } = await reader.read();
      reader.releaseLock();
      expect(new TextDecoder().decode(value)).toContain('Punktlandung läuft');
      client = await Bun.connect({
        hostname: '127.0.0.1',
        port: Number(port),
        socket: { data: () => undefined },
      });
      client.pause();
      client.write('GET /large.bin HTTP/1.1\r\nhost: 127.0.0.1\r\n\r\n');
      await Bun.sleep(settleMs);

      child.kill('SIGTERM');
      await Bun.sleep(settleMs);
      child.kill('SIGTERM');
      await Bun.sleep(settleMs);
      client.end();

      expect(await child.exited).toBe(0);
    } finally {
      client?.terminate();
      child.kill('SIGKILL');
    }
  });
});
