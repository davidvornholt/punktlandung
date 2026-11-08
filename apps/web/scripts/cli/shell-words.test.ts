import { describe, expect, it } from 'bun:test';
import { UsageError } from './errors/cli-errors.ts';
import { splitShellWords } from './shell-words.ts';

describe('splitShellWords', () => {
  it('splits on runs of whitespace', () => {
    expect(splitShellWords('  noten   list\t--halbjahr 10.2 ')).toEqual([
      'noten',
      'list',
      '--halbjahr',
      '10.2',
    ]);
  });

  it('keeps single-quoted text literal', () => {
    expect(splitShellWords(`noten 'a "b" $c \\d'`)).toEqual([
      'noten',
      'a "b" $c \\d',
    ]);
  });

  it('reads the quoting that the client wrapper produces', () => {
    expect(splitShellWords(`'noten' 'list' 'it'\\''s'`)).toEqual([
      'noten',
      'list',
      "it's",
    ]);
  });

  it('unescapes only what a shell unescapes in double quotes', () => {
    expect(splitShellWords(`noten "a \\"b\\" \\n \\$"`)).toEqual([
      'noten',
      'a "b" \\n $',
    ]);
  });

  it('keeps an empty quoted word', () => {
    expect(splitShellWords(`noten ''`)).toEqual(['noten', '']);
  });

  it('expands nothing', () => {
    expect(splitShellWords('noten $(id) `id` ~ *')).toEqual([
      'noten',
      '$(id)',
      '`id`',
      '~',
      '*',
    ]);
  });

  it('refuses an unclosed quote or a trailing backslash', () => {
    expect(splitShellWords(`noten 'open`)).toBeInstanceOf(UsageError);
    expect(splitShellWords('noten open\\')).toBeInstanceOf(UsageError);
  });
});
