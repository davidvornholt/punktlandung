import { describe, expect, it } from 'bun:test';
import { Exit, Schema } from 'effect';

import { throwExitFailure, UnexpectedFailure } from './exit-failure.ts';

class Expected extends Schema.TaggedError<Expected>()('Expected', {
  message: Schema.String,
}) {}

const thrownBy = (exit: Exit.Exit<unknown, unknown>): unknown => {
  try {
    throwExitFailure(exit);
  } catch (error) {
    return error;
  }
  throw new Error('throwExitFailure hat nicht geworfen.');
};

describe('throwExitFailure', () => {
  it('returns the success value', () => {
    expect(throwExitFailure(Exit.succeed(42))).toBe(42);
  });

  it('throws an expected failure as itself so its tag survives', () => {
    const failure = new Expected({ message: 'Fachlich abgelehnt.' });

    expect(thrownBy(Exit.fail(failure))).toBe(failure);
  });

  it('keeps defects inside an UnexpectedFailure', () => {
    const thrown = thrownBy(Exit.die(new Error('kaputt')));

    expect(thrown instanceof UnexpectedFailure).toBe(true);
  });

  it('wraps failures without an Error prototype', () => {
    const thrown = thrownBy(
      Exit.fail({ _tag: 'MissingData', message: 'DATABASE_URL fehlt' }),
    );

    expect(thrown instanceof UnexpectedFailure).toBe(true);
  });
});
