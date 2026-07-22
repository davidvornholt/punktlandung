import { expect, it } from 'bun:test';
import { file } from 'bun';

const workflowFiles = [
  '../.github/workflows/notify-pause.yml',
  '../.github/workflows/standards-sync.yml',
  '../.github/workflows/standards.yml',
] as const;

const consumerKeyPatterns = [
  /secret-key:\s+(?<key>[a-z_]+)/gu,
  /\["ci"\]\["(?<key>[a-z_]+)"\]/gu,
] as const;

const extractKeys = (source: string, pattern: RegExp) =>
  [...source.matchAll(pattern)]
    .map((match) => match.groups?.key)
    .filter((key): key is string => key !== undefined);

it('keeps the CI secret example aligned with workflow consumers', async () => {
  const workflowSources = await Promise.all(
    workflowFiles.map((path) => file(new URL(path, import.meta.url)).text()),
  );
  const consumedKeys = workflowSources.flatMap((source) =>
    consumerKeyPatterns.flatMap((pattern) => extractKeys(source, pattern)),
  );
  const example = await file(
    new URL('../secrets/ci.example.yaml', import.meta.url),
  ).text();
  const declaredKeys = extractKeys(example, /^ {2}(?<key>[a-z_]+):/gmu);

  expect([...new Set(declaredKeys)].sort()).toEqual(
    [...new Set(consumedKeys)].sort(),
  );
});
