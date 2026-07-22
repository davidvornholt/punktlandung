import { expect, it } from 'bun:test';
import { spawn } from 'bun';

it('does not track Turborepo cache artifacts', async () => {
  const process = spawn(['git', 'ls-files', '-z'], {
    cwd: new URL('..', import.meta.url).pathname,
    stdout: 'pipe',
  });
  const trackedPaths = (await new Response(process.stdout).text())
    .split('\0')
    .filter((path) => path.split('/').includes('.turbo'));

  expect(await process.exited).toBe(0);
  expect(trackedPaths).toEqual([]);
});
