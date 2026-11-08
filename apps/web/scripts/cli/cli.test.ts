import { describe, expect, it } from 'bun:test';
import { runPunktlandung } from './cli-test-support.ts';

const words = (command: string) => (command === '' ? [] : command.split(' '));

describe('punktlandung on the command line', () => {
  it.each([
    '--bogus',
    'noten get',
    'noten list --halbjahr',
    'noten list --halbjahr 10.1 --halbjahr 10.2',
  ])(
    'reports `punktlandung %s` as one JSON error and prints no help',
    async (command) => {
      const result = await runPunktlandung(words(command));
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe('');
      expect(JSON.parse(result.stderr)).toEqual({
        error: { tag: 'UsageError', message: expect.any(String) },
      });
    },
  );

  it.each([
    '',
    '--help',
    'noten',
    'zeugnis --help',
    'noten list --help --json',
  ])(
    'prints help for `punktlandung %s` without touching the database',
    async (command) => {
      const result = await runPunktlandung(words(command));
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('USAGE');
      expect(result.stderr).toBe('');
    },
  );

  it('reads the command line the SSH door passes on', async () => {
    const result = await runPunktlandung([], {
      sshOriginalCommand: `'noten' 'list' '--help'`,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('punktlandung noten list');
  });

  it('refuses a command line it cannot split', async () => {
    const result = await runPunktlandung([], {
      sshOriginalCommand: `noten list --halbjahr '10.2`,
    });
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stderr)).toEqual({
      error: {
        tag: 'UsageError',
        message: 'The command line has a quote that is never closed.',
      },
    });
  });

  it('says so when it has no database', async () => {
    const result = await runPunktlandung(['halbjahre', 'list', '--json']);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr).error.tag).toBe('DatabaseUnavailable');
  });
});
