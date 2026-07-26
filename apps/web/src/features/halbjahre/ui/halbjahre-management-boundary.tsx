import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { determineQueryState } from '#/shared/ui/query-state-model.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import {
  useHalbjahrDeletionCompletion,
  useHalbjahrDeletionFocusCapture,
} from './halbjahr-deletion-completion.ts';
import { HalbjahrForm } from './halbjahr-form.tsx';
import { HalbjahrList } from './halbjahr-list.tsx';
import { useHalbjahrMutations } from './halbjahr-mutations.ts';
import type { HalbjahrOperations } from './halbjahr-operations.ts';

const editKey = (editTarget: HalbjahrWithNotenCount | 'create' | null) => {
  if (editTarget === null || editTarget === 'create') {
    return editTarget;
  }
  return editTarget.id;
};

const halbjahrFormError = (
  createMutation: { readonly error: unknown; readonly isError: boolean },
  updateMutation: { readonly error: unknown; readonly isError: boolean },
): string | null => {
  if (createMutation.isError) {
    return actionErrorText(
      createMutation.error,
      'Das Halbjahr konnte nicht angelegt werden. Prüfe die Verbindung und versuche es erneut.',
    );
  }
  if (updateMutation.isError) {
    return actionErrorText(
      updateMutation.error,
      'Das Halbjahr konnte nicht geändert werden. Die Eingaben bleiben erhalten; versuche es erneut.',
    );
  }
  return null;
};

export const HalbjahreManagementBoundary = ({
  operations,
}: {
  readonly operations: HalbjahrOperations;
}) => {
  const halbjahreQuery = useQuery({
    queryFn: operations.list,
    queryKey: ['halbjahre'],
  });
  const [editTarget, setEditTarget] = useState<
    HalbjahrWithNotenCount | 'create' | null
  >(null);
  const formKey = editKey(editTarget);
  const focus = useFormFocus(formKey);
  const deletionCompletion = useHalbjahrDeletionCompletion(
    focus.formRef,
    focus.fallbackTriggerRef,
  );
  const captureDeletionFocus = useHalbjahrDeletionFocusCapture();

  const { createMutation, deleteMutation, updateMutation } =
    useHalbjahrMutations({
      onDeleted: (request) => {
        const { halbjahr } = request;
        if (
          editTarget !== null &&
          editTarget !== 'create' &&
          editTarget.id === halbjahr.id
        ) {
          focus.suppressNextRestore();
          setEditTarget(null);
        }
        deletionCompletion.complete(request);
      },
      onEditorClose: () => setEditTarget(null),
      operations,
    });
  const halbjahre = halbjahreQuery.data;
  const queryState = determineQueryState({
    data: halbjahre,
    isError: halbjahreQuery.isError,
    isPending: halbjahreQuery.isPending,
    isEmpty: (values) => values.length === 0,
  });
  const formError = halbjahrFormError(createMutation, updateMutation);

  return (
    <section>
      <p className="sr-only" role="status">
        {deletionCompletion.message}
      </p>
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl text-ink tracking-tight">
          Halbjahre
        </h2>
        {editTarget === null ? (
          <button
            className={primaryButtonClass}
            onClick={(event) => {
              focus.rememberTrigger(event.currentTarget);
              createMutation.reset();
              updateMutation.reset();
              setEditTarget('create');
            }}
            ref={focus.fallbackTriggerRef}
            type="button"
          >
            Halbjahr anlegen
          </button>
        ) : null}
      </div>
      {editTarget === null ? null : (
        <div className="mt-4">
          <HalbjahrForm
            pending={createMutation.isPending || updateMutation.isPending}
            error={formError}
            formRef={focus.formRef}
            halbjahr={editTarget === 'create' ? null : editTarget}
            halbjahre={halbjahre ?? []}
            today={berlinCalendarDate()}
            key={formKey}
            onCancel={() => setEditTarget(null)}
            onSave={(values) => {
              if (editTarget === 'create') {
                createMutation.reset();
                createMutation.mutate(values);
              } else {
                updateMutation.reset();
                updateMutation.mutate({ ...values, id: editTarget.id });
              }
            }}
            title={
              editTarget === 'create' ? 'Neues Halbjahr' : 'Halbjahr bearbeiten'
            }
          />
        </div>
      )}
      {queryState === 'pending' ? (
        <div className="mt-4">
          <LoadingHint text="Halbjahre werden geladen …" />
        </div>
      ) : null}
      {queryState === 'error' ? (
        <div className="mt-4">
          <QueryError
            onRetry={() => halbjahreQuery.refetch()}
            text="Die Halbjahre konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {queryState === 'success' && halbjahre !== undefined ? (
        <HalbjahrList
          halbjahre={halbjahre}
          deletion={{
            error: deleteMutation.error,
            isError: deleteMutation.isError,
            isPending: deleteMutation.isPending,
            variables: deleteMutation.variables?.halbjahr.id,
          }}
          onEdit={(halbjahr, trigger) => {
            focus.rememberTrigger(trigger);
            createMutation.reset();
            updateMutation.reset();
            setEditTarget(halbjahr);
          }}
          onDelete={(request) => {
            deleteMutation.reset();
            deleteMutation.mutate({
              ...request,
              focusOwnership: captureDeletionFocus(request.deletionTrigger),
            });
          }}
        />
      ) : null}
      {queryState === 'empty' && editTarget === null ? (
        <div className="mt-4 border border-border bg-surface-sunken p-6">
          <p className="text-ink-muted">
            Noch keine Halbjahre. Lege zuerst das laufende Halbjahr an — du
            wählst nur Klassenstufe, Schuljahr und Halbjahr, den Rest ergänzt
            Punktlandung.
          </p>
        </div>
      ) : null}
    </section>
  );
};
