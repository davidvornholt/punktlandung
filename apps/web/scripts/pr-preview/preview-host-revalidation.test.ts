import { describe, expect, it } from 'bun:test';
import {
  apiRecord,
  eligiblePullRequest,
  headSha,
} from './preview-selection-fixtures';
import { extractRunScript, readWorkflow } from './workflow-test-helpers';

const script = extractRunScript(
  await readWorkflow('pr-preview-deploy.yml'),
  'Revalidate eligibility and run the restricted host command',
);

type HostScenario = {
  readonly operation: 'deploy' | 'destroy';
  readonly reason: string;
  readonly pullRequest: Record<string, unknown>;
};

const runHost = ({ operation, pullRequest, reason }: HostScenario) => {
  const result = globalThis.Bun.spawnSync(
    [
      'bash',
      '-c',
      `
set -u
test_root=$(mktemp -d /tmp/punktlandung-preview-host-test.XXXXXX)
trap 'rm -rf -- "$test_root"' EXIT
export RUNNER_TEMP="$test_root"
export GITHUB_OUTPUT="$test_root/outputs"
: >"$GITHUB_OUTPUT"
mkdir "$test_root/bin"
printf '#!/bin/sh\\necho called >"%s/ssh-called"\\n' "$test_root" >"$test_root/bin/ssh"
chmod +x "$test_root/bin/ssh"
export PATH="$test_root/bin:$PATH"
gh() { printf '%s' "$TEST_PR"; }
set +e
(
${script}
)
status=$?
printf '\\n__OUTPUTS__\\n'
cat "$GITHUB_OUTPUT"
printf '__SSH__\\n'
test -f "$test_root/ssh-called" && echo called
exit "$status"
`,
    ],
    {
      env: {
        ...globalThis.Bun.env,
        ...Object.fromEntries([
          ['TEST_PR', JSON.stringify(pullRequest)],
          // A removal job knows no head, as in the workflow.
          ['HEAD_SHA', operation === 'destroy' ? '' : headSha],
          ['HOST_COMMAND', 'destroy 35'],
          ['OPERATION', operation],
          ['PREVIOUS_BASE_REF', ''],
          ['PR_NUMBER', '35'],
          ['REASON', reason],
          ['REPOSITORY', 'davidvornholt/punktlandung'],
        ]),
      },
    },
  );
  const stdout = result.stdout.toString();
  const [, after = ''] = stdout.split('__OUTPUTS__\n', 2);
  const [outputText = '', ssh = ''] = after.split('__SSH__\n', 2);
  const outputs = Object.fromEntries(
    outputText
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('=', 2) as [string, string]),
  );
  return {
    exitCode: result.exitCode,
    outputs,
    reachedHost: ssh.trim() === 'called',
  };
};

describe('host step revalidation', () => {
  it('steps aside without failing when a pull request is eligible again before its removal', () => {
    const result = runHost({
      operation: 'destroy',
      reason: 'ineligible',
      pullRequest: eligiblePullRequest(),
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs.superseded).toBe('true');
    expect(result.reachedHost).toBe(false);
  });

  it('fails a deployment when the pull request is no longer eligible, so the failed-deploy cleanup removes the older preview', () => {
    const result = runHost({
      operation: 'deploy',
      reason: '',
      pullRequest: eligiblePullRequest({ draft: true }),
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.reachedHost).toBe(false);
  });

  it('removes the preview of a pull request that is still ineligible', () => {
    const result = runHost({
      operation: 'destroy',
      reason: 'ineligible',
      pullRequest: eligiblePullRequest({ draft: true }),
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs.superseded).toBe('false');
    expect(result.reachedHost).toBe(true);
  });

  it('deploys the exact head of an eligible pull request', () => {
    const result = runHost({
      operation: 'deploy',
      reason: '',
      pullRequest: eligiblePullRequest(),
    });
    expect(result.exitCode).toBe(0);
    expect(result.outputs.superseded).toBe('false');
    expect(result.reachedHost).toBe(true);
  });

  it('still refuses to deploy a head that is no longer current', () => {
    const result = runHost({
      operation: 'deploy',
      reason: '',
      pullRequest: eligiblePullRequest({
        head: apiRecord([
          ['repo', apiRecord([['full_name', 'davidvornholt/punktlandung']])],
          ['sha', '3333333333333333333333333333333333333333'],
        ]),
      }),
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.reachedHost).toBe(false);
  });
});
