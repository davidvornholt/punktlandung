import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { Leistung } from '../services/noten-service.ts';
import type { notenMutationOptions } from './noten-mutations.ts';

export const usePendingUpdates = (
  options: ReturnType<typeof notenMutationOptions>['update'],
  editTarget: Leistung | null,
) => {
  const [pendingUpdates, setPendingUpdates] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const updateMutation = useMutation({
    ...options,
    onMutate: ({ id }) =>
      setPendingUpdates((pending) => new Set(pending).add(id)),
    onSettled: (_data, _error, { id }) =>
      setPendingUpdates((pending) => {
        const remaining = new Set(pending);
        remaining.delete(id);
        return remaining;
      }),
  });
  return {
    updateMutation,
    editPending: editTarget !== null && pendingUpdates.has(editTarget.id),
  };
};
