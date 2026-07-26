import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type HalbjahrDeletionRequest,
  isProtectedHalbjahrDeletionError,
} from './halbjahr-deletion-model.ts';
import type { HalbjahrOperations } from './halbjahr-operations.ts';

type QueryInvalidator = {
  readonly invalidateQueries: (options: {
    readonly queryKey: ReadonlyArray<string>;
  }) => Promise<unknown>;
};

export const halbjahrMutationOptions = ({
  onDeleted,
  onEditorClose,
  operations,
  queryClient,
}: {
  readonly onDeleted: (request: HalbjahrDeletionRequest) => void;
  readonly onEditorClose: () => void;
  readonly operations: HalbjahrOperations;
  readonly queryClient: QueryInvalidator;
}) => {
  const closeAfterSuccess = () => {
    onEditorClose();
    return queryClient.invalidateQueries({ queryKey: ['halbjahre'] });
  };
  return {
    create: {
      mutationFn: operations.create,
      onSuccess: closeAfterSuccess,
    },
    deletion: {
      mutationFn: ({
        expectedFinalInSchoolYear,
        halbjahr,
      }: HalbjahrDeletionRequest) =>
        operations.delete({ expectedFinalInSchoolYear, id: halbjahr.id }),
      onError: (error: unknown, request: HalbjahrDeletionRequest) => {
        request.focusOwnership.release();
        return isProtectedHalbjahrDeletionError(error)
          ? queryClient.invalidateQueries({ queryKey: ['halbjahre'] })
          : undefined;
      },
      onSuccess: (_result: unknown, request: HalbjahrDeletionRequest) => {
        onDeleted(request);
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: ['halbjahre'] }),
          queryClient.invalidateQueries({ queryKey: ['faecher'] }),
        ]);
      },
    },
    update: {
      mutationFn: operations.update,
      onSuccess: closeAfterSuccess,
    },
  };
};

export const useHalbjahrMutations = ({
  onDeleted,
  onEditorClose,
  operations,
}: {
  readonly onDeleted: (request: HalbjahrDeletionRequest) => void;
  readonly onEditorClose: () => void;
  readonly operations: HalbjahrOperations;
}) => {
  const queryClient = useQueryClient();
  const options = halbjahrMutationOptions({
    onDeleted,
    onEditorClose,
    operations,
    queryClient,
  });
  const createMutation = useMutation(options.create);
  const updateMutation = useMutation(options.update);
  const deleteMutation = useMutation(options.deletion);
  return { createMutation, deleteMutation, updateMutation };
};
