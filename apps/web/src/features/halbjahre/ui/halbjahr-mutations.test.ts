import { describe, expect, it, mock } from 'bun:test';

import {
  HalbjahrDeletionBlockedByNoten,
  HalbjahrDeletionConsequenceChanged,
} from '../errors/halbjahr-errors.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import type { HalbjahrDeletionRequest } from './halbjahr-deletion-model.ts';
import { halbjahrMutationOptions } from './halbjahr-mutations.ts';
import type { HalbjahrOperations } from './halbjahr-operations.ts';

const invalidateQueries = mock((_options: unknown) => Promise.resolve());
const deleteHalbjahr = mock(() => Promise.resolve());
const operations: HalbjahrOperations = {
  create: mock(() => Promise.resolve()),
  delete: deleteHalbjahr,
  list: mock(() => Promise.resolve([])),
  update: mock(() => Promise.resolve()),
};

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
  adjacentFocusTarget: null,
  deletionTrigger: {} as HTMLButtonElement,
  expectedFinalInSchoolYear: true,
  focusOwnership: {
    isOwned: mock(() => true),
    release: mock(() => undefined),
  },
  halbjahr,
};

const deletionOptions = (onDeleted: (value: HalbjahrDeletionRequest) => void) =>
  halbjahrMutationOptions({
    onDeleted,
    onEditorClose: () => undefined,
    operations,
    queryClient: { invalidateQueries },
  }).deletion;

describe('halbjahrMutationOptions deletion', () => {
  it('dispatches to the service and refreshes stale protected eligibility', async () => {
    invalidateQueries.mockClear();
    const onDeleted = mock(() => undefined);
    const deletion = deletionOptions(onDeleted);

    await deletion.mutationFn(request);
    expect(deleteHalbjahr).toHaveBeenCalledWith({
      expectedFinalInSchoolYear: true,
      id: 'target',
    });

    const refresh = deletion.onError(
      new HalbjahrDeletionBlockedByNoten({
        halbjahrId: 'target',
        notenCount: 2,
      }),
      request,
    );
    if (refresh === undefined) {
      throw new Error('Protected rejection did not request a refresh.');
    }
    await refresh;
    expect(invalidateQueries).toHaveBeenLastCalledWith({
      queryKey: ['halbjahre'],
    });

    invalidateQueries.mockClear();
    const consequenceRefresh = deletion.onError(
      new HalbjahrDeletionConsequenceChanged({
        actualFinalInSchoolYear: true,
        expectedFinalInSchoolYear: false,
        halbjahrId: 'target',
      }),
      request,
    );
    if (consequenceRefresh === undefined) {
      throw new Error('Stale consequence rejection did not request a refresh.');
    }
    await consequenceRefresh;
    expect(invalidateQueries).toHaveBeenLastCalledWith({
      queryKey: ['halbjahre'],
    });

    invalidateQueries.mockClear();
    expect(deletion.onError(new Error('offline'), request)).toBeUndefined();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('announces the successful target and invalidates both affected lists', async () => {
    invalidateQueries.mockClear();
    const onDeleted = mock(() => undefined);
    const deletion = deletionOptions(onDeleted);

    await deletion.onSuccess(undefined, request);

    expect(onDeleted).toHaveBeenCalledWith(request);
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual([
      { queryKey: ['halbjahre'] },
      { queryKey: ['faecher'] },
    ]);
  });
});
