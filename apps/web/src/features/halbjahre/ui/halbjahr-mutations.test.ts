import { afterAll, describe, expect, it, mock } from 'bun:test';

import { HalbjahrDeletionBlockedByNoten } from '../errors/halbjahr-errors.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import type { HalbjahrDeletionRequest } from './halbjahr-deletion-model.ts';

type DeletionOptions = {
  readonly mutationFn: (request: HalbjahrDeletionRequest) => Promise<unknown>;
  readonly onError: (error: unknown) => Promise<unknown> | undefined;
  readonly onSuccess: (
    result: unknown,
    request: HalbjahrDeletionRequest,
  ) => Promise<unknown>;
};

let mutationCall = 0;
let deletionOptions: DeletionOptions | null = null;
const invalidateQueries = mock((_options: unknown) => Promise.resolve());
const deleteHalbjahrFn = mock(() => Promise.resolve());

mock.module('@tanstack/react-query', () => ({
  useMutation: (options: unknown) => {
    mutationCall += 1;
    if (mutationCall === 3) {
      deletionOptions = options as DeletionOptions;
    }
    return {};
  },
  useQueryClient: () => ({ invalidateQueries }),
}));
mock.module('../server/halbjahr-fns.ts', () => ({
  createHalbjahrFn: mock(() => Promise.resolve()),
  deleteHalbjahrFn,
  updateHalbjahrFn: mock(() => Promise.resolve()),
}));

const { useHalbjahrMutations } = await import('./halbjahr-mutations.ts');

const halbjahr: HalbjahrWithNotenCount = {
  endsOn: '2027-01-31',
  half: 1,
  id: 'target',
  klassenstufe: '10',
  notenCount: 0,
  schoolYear: '2026/27',
  startsOn: '2026-08-01',
  system: 'sechser',
};
const request: HalbjahrDeletionRequest = {
  focusTarget: null,
  halbjahr,
};

const registerDeletion = (
  onDeleted: (value: HalbjahrDeletionRequest) => void,
): DeletionOptions => {
  mutationCall = 0;
  deletionOptions = null;
  useHalbjahrMutations({
    onDeleted,
    onEditorClose: () => undefined,
  });
  if (deletionOptions === null) {
    throw new Error('Deletion mutation was not registered.');
  }
  return deletionOptions;
};

afterAll(() => {
  mock.restore();
});

describe('useHalbjahrMutations deletion', () => {
  it('dispatches to the service and refreshes stale protected eligibility', async () => {
    invalidateQueries.mockClear();
    const onDeleted = mock(() => undefined);
    const deletion = registerDeletion(onDeleted);

    await deletion.mutationFn(request);
    expect(deleteHalbjahrFn).toHaveBeenCalledWith({
      data: { id: 'target' },
    });

    const refresh = deletion.onError(
      new HalbjahrDeletionBlockedByNoten({
        halbjahrId: 'target',
        notenCount: 2,
      }),
    );
    if (refresh === undefined) {
      throw new Error('Protected rejection did not request a refresh.');
    }
    await refresh;
    expect(invalidateQueries).toHaveBeenLastCalledWith({
      queryKey: ['halbjahre'],
    });

    invalidateQueries.mockClear();
    expect(deletion.onError(new Error('offline'))).toBeUndefined();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('announces the successful target and invalidates both affected lists', async () => {
    invalidateQueries.mockClear();
    const onDeleted = mock(() => undefined);
    const deletion = registerDeletion(onDeleted);

    await deletion.onSuccess(undefined, request);

    expect(onDeleted).toHaveBeenCalledWith(request);
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual([
      { queryKey: ['halbjahre'] },
      { queryKey: ['faecher'] },
    ]);
  });
});
