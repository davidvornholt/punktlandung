import { describe, expect, it } from 'bun:test';
import { file } from 'bun';

const sensitiveServerFiles = [
  '../../features/faecher/server/fach-fns.ts',
  '../../features/halbjahre/server/halbjahr-fns.ts',
  '../../features/lernen/server/lernen-fns.ts',
  '../../features/noten/server/noten-fns.ts',
  '../../features/zeugnis/server/zeugnis-fns.ts',
] as const;

const expectedFunctionCount = 16;

describe('sensitive server-function class', () => {
  it('attaches authentication middleware to every handler', async () => {
    const handlers = (
      await Promise.all(
        sensitiveServerFiles.map(async (path) => {
          const source = await file(new URL(path, import.meta.url)).text();
          return [
            ...source.matchAll(
              /export const \w+Fn = createServerFn[\s\S]*?\.handler\(/gu,
            ),
          ];
        }),
      )
    ).flat();

    expect(handlers).toHaveLength(expectedFunctionCount);
    for (const handler of handlers) {
      expect(handler[0]).toContain('.middleware([sitzungErforderlich])');
    }
  });
});
