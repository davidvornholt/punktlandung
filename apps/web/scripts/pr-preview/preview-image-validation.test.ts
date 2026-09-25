import { describe, expect, it } from 'bun:test';
import { headSha } from './preview-selection-fixtures';
import { extractRunScript, readWorkflow } from './workflow-test-helpers';

const validateImage = extractRunScript(
  await readWorkflow('pr-preview-deploy.yml'),
  'Load and validate the untrusted image without running it',
);
const dockerfile = await globalThis.Bun.file(
  new URL('../../../../Dockerfile', import.meta.url),
).text();
const runtimeUser = [...dockerfile.matchAll(/^USER\s+(?<user>\S+)$/gmu)].at(-1)
  ?.groups?.user;

const runValidation = (user: string) =>
  globalThis.Bun.spawnSync(
    [
      'bash',
      '-c',
      `
docker() {
  if [ "$1 $2" = 'image load' ]; then return 0; fi
  test "$1 $2" = 'image inspect' || return 97
  case "\${!#}" in
    '{{ json .RepoTags }}') printf '%s' '["punktlandung:pull-request"]' ;;
    '{{.Os}}') printf '%s' linux ;;
    '{{.Architecture}}') printf '%s' amd64 ;;
    '{{.Config.User}}') printf '%s' "$TEST_IMAGE_USER" ;;
    '{{.Size}}') printf '%s' 1024 ;;
    '{{ index .Config.Labels "org.opencontainers.image.revision" }}') printf '%s' "$HEAD_SHA" ;;
    '{{ index .Config.Labels "org.opencontainers.image.source" }}') printf 'https://github.com/%s' "$REPOSITORY" ;;
    '{{ index .Config.Labels "io.personal-infra.punktlandung-preview" }}') printf '%s' true ;;
    *) return 98 ;;
  esac
}
${validateImage}
`,
    ],
    {
      env: {
        ...globalThis.Bun.env,
        ...Object.fromEntries([
          ['TEST_IMAGE_USER', user],
          ['RUNNER_TEMP', '/unused-preview-artifact'],
          ['HEAD_SHA', headSha],
          ['REPOSITORY', 'davidvornholt/punktlandung'],
        ]),
      },
    },
  );

describe('trusted preview image validation', () => {
  it('accepts the nonroot user declared by the actual runtime Dockerfile', () => {
    expect(runtimeUser).toBe('bun');
    expect(runValidation(runtimeUser ?? '').exitCode).toBe(0);
  });

  it.each(['root', '0', '', 'app'])(
    'rejects an image with the unexpected runtime user %s',
    (user) => {
      expect(runValidation(user).exitCode).not.toBe(0);
    },
  );
});
