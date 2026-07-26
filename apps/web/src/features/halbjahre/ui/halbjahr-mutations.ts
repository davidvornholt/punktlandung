import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { HalbjahrEingabe } from '../schemas/halbjahr-schema.ts';
import {
  createHalbjahrFn,
  deleteHalbjahrFn,
  updateHalbjahrFn,
} from '../server/halbjahr-fns.ts';
import {
  type HalbjahrDeletionRequest,
  isProtectedHalbjahrDeletionError,
} from './halbjahr-deletion-model.ts';

export const useHalbjahrMutations = ({
  onDeleted,
  onEditorClose,
}: {
  readonly onDeleted: (request: HalbjahrDeletionRequest) => void;
  readonly onEditorClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const closeAfterSuccess = () => {
    onEditorClose();
    return queryClient.invalidateQueries({ queryKey: ['halbjahre'] });
  };
  const anlegen = useMutation({
    mutationFn: (values: HalbjahrEingabe) => createHalbjahrFn({ data: values }),
    onSuccess: closeAfterSuccess,
  });
  const aendern = useMutation({
    mutationFn: (values: HalbjahrEingabe & { readonly id: string }) =>
      updateHalbjahrFn({ data: values }),
    onSuccess: closeAfterSuccess,
  });
  const loeschen = useMutation({
    mutationFn: ({ halbjahr }: HalbjahrDeletionRequest) =>
      deleteHalbjahrFn({ data: { id: halbjahr.id } }),
    onError: (error) =>
      isProtectedHalbjahrDeletionError(error)
        ? queryClient.invalidateQueries({ queryKey: ['halbjahre'] })
        : undefined,
    onSuccess: (_result, request: HalbjahrDeletionRequest) => {
      onDeleted(request);
      // Mit dem letzten Halbjahr eines Schuljahrs entfällt dessen Fachstand.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['halbjahre'] }),
        queryClient.invalidateQueries({ queryKey: ['faecher'] }),
      ]);
    },
  });
  return { aendern, anlegen, loeschen };
};
