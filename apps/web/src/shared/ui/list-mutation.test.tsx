import { expect, it } from 'bun:test';
import { listMutationState } from './list-mutation.ts';

it('attributes pending and error state only to its target', () => {
  const failure = new Error('offline');
  const mutation = {
    error: failure,
    isError: true,
    isPending: false,
    variables: 'a',
  };
  expect(listMutationState(mutation, 'a').error).toBe(failure);
  expect(listMutationState(mutation, 'b').error).toBeNull();
  expect(
    listMutationState({ ...mutation, isPending: true }, 'b'),
  ).toMatchObject({ disabled: true, pending: false });
});
