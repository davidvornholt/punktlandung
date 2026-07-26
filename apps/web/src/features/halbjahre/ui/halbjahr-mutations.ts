import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type HalbjahrDeletionRequest,
  isProtectedHalbjahrDeletionError,
} from './halbjahr-deletion-model.ts';
import type { HalbjahrOperations } from './halbjahr-operations.ts';

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
  const closeAfterSuccess = () => {
    onEditorClose();
    return queryClient.invalidateQueries({ queryKey: ['halbjahre'] });
  };
  const createMutation = useMutation({
    mutationFn: operations.create,
    onSuccess: closeAfterSuccess,
  });
  const updateMutation = useMutation({
    mutationFn: operations.update,
    onSuccess: closeAfterSuccess,
  });
  const deleteMutation = useMutation({
    mutationFn: ({
      expectedFinalInSchoolYear,
      halbjahr,
    }: HalbjahrDeletionRequest) =>
      operations.delete({ expectedFinalInSchoolYear, id: halbjahr.id }),
    onError: (error, request) => {
      request.focusOwnership.release();
      return isProtectedHalbjahrDeletionError(error)
        ? queryClient.invalidateQueries({ queryKey: ['halbjahre'] })
        : undefined;
    },
    onSuccess: (_result, request: HalbjahrDeletionRequest) => {
      onDeleted(request);
      // Mit dem letzten Halbjahr eines Schuljahrs entfällt dessen Fachstand.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['halbjahre'] }),
        queryClient.invalidateQueries({ queryKey: ['faecher'] }),
      ]);
    },
  });
  return { createMutation, deleteMutation, updateMutation };
};
