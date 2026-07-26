import type { QueryInvalidator } from '#/shared/query/query-invalidation.ts';
import type { FachFields } from '../schemas/fach-schema.ts';
import { invalidateFachQueries } from './fach-invalidation.ts';
import type { FachOperations } from './fach-operations.ts';

/**
 * Die drei Fachmutationen als reine Optionen, damit prüfbar bleibt, was nach
 * einem Erfolg veraltet: alle drei ändern den Fachstand des Schuljahrs und
 * damit dieselben Ansichten.
 */
export const fachMutationOptions = ({
  onEditorClose,
  operations,
  queryClient,
  schoolYear,
}: {
  readonly onEditorClose: () => void;
  readonly operations: FachOperations;
  readonly queryClient: QueryInvalidator;
  readonly schoolYear: string;
}) => {
  const refresh = () => invalidateFachQueries(queryClient, schoolYear);
  const closeOnSuccess = () => {
    onEditorClose();
    return refresh();
  };
  return {
    archive: {
      mutationFn: (id: string) => operations.archive({ id, schoolYear }),
      onSuccess: refresh,
    },
    create: {
      mutationFn: (values: FachFields) =>
        operations.create({ ...values, schoolYear }),
      onSuccess: closeOnSuccess,
    },
    update: {
      mutationFn: (values: FachFields & { readonly id: string }) =>
        operations.update({ ...values, schoolYear }),
      onSuccess: closeOnSuccess,
    },
  };
};
