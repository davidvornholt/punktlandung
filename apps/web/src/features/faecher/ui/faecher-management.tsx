import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import {
  inputClass,
  labelClass,
  primaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { determineQueryState } from '#/shared/ui/query-state-model.ts';
import type { FachFields } from '../schemas/fach-schema.ts';
import {
  archiveFachFn,
  createFachFn,
  faecherQueryOptions,
  updateFachFn,
} from '../server/fach-fns.ts';
import type { Fach } from '../services/fach-service.ts';
import { FachForm } from './fach-form.tsx';
import { FachList } from './fach-list.tsx';
import { changeSchoolYear } from './school-year-change.ts';

const editKey = (editTarget: Fach | 'create' | null) => {
  if (editTarget === null || editTarget === 'create') {
    return editTarget;
  }
  return editTarget.id;
};

const fachFormError = (
  createMutation: { readonly error: unknown; readonly isError: boolean },
  updateMutation: { readonly error: unknown; readonly isError: boolean },
): string | null => {
  if (createMutation.isError) {
    return actionErrorText(
      createMutation.error,
      'Das Fach konnte nicht angelegt werden. Prüfe die Verbindung und versuche es erneut.',
    );
  }
  if (updateMutation.isError) {
    return actionErrorText(
      updateMutation.error,
      'Das Fach konnte nicht geändert werden. Die Eingaben bleiben erhalten; versuche es erneut.',
    );
  }
  return null;
};

/** Ein Schuljahr mit dem Notensystem, in dem seine Halbjahre gewertet werden. */
export type SchoolYearOption = {
  readonly schoolYear: string;
  readonly system: Notensystem;
};

const systemFor = (
  schoolYears: ReadonlyArray<SchoolYearOption>,
  schoolYear: string,
): Notensystem =>
  schoolYears.find((year) => year.schoolYear === schoolYear)?.system ??
  'sechser';

const NoHalbjahr = () => (
  <section className="border border-border bg-surface-sunken p-6">
    <h2 className="font-display text-2xl text-ink tracking-tight">Fächer</h2>
    <p className="mt-2 text-ink-muted">
      Lege zuerst ein Halbjahr an. Danach verwaltest du die Fächer für das
      zugehörige Schuljahr.
    </p>
  </section>
);

export const FaecherManagement = ({
  schoolYears,
}: {
  readonly schoolYears: ReadonlyArray<SchoolYearOption>;
}) => {
  const queryClient = useQueryClient();
  const [schoolYear, setSchoolYear] = useState(
    schoolYears[0]?.schoolYear ?? '',
  );
  const faecherQuery = useQuery({
    ...faecherQueryOptions(schoolYear),
    enabled: schoolYear !== '',
  });
  const [editTarget, setEditTarget] = useState<Fach | 'create' | null>(null);
  const formKey = editKey(editTarget);
  const focus = useFormFocus(formKey);

  const closeOnSuccess = () => {
    setEditTarget(null);
    return queryClient.invalidateQueries({
      queryKey: ['faecher', schoolYear],
    });
  };
  const createMutation = useMutation({
    mutationFn: (values: FachFields) =>
      createFachFn({ data: { ...values, schoolYear } }),
    onSuccess: closeOnSuccess,
  });
  const updateMutation = useMutation({
    mutationFn: (values: FachFields & { readonly id: string }) =>
      updateFachFn({ data: { ...values, schoolYear } }),
    onSuccess: closeOnSuccess,
  });
  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveFachFn({ data: { id, schoolYear } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['faecher', schoolYear] }),
  });
  const faecher = faecherQuery.data;
  const queryState = determineQueryState({
    data: faecher,
    isError: faecherQuery.isError,
    isPending: faecherQuery.isPending,
    isEmpty: (values) => values.length === 0,
  });
  const formError = fachFormError(createMutation, updateMutation);

  if (schoolYear === '') {
    return <NoHalbjahr />;
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ink tracking-tight">
            Fächer {schoolYear}
          </h2>
          <label className={`${labelClass} mt-3 max-w-xs`}>
            Schuljahr
            <select
              className={inputClass}
              onChange={(event) => {
                changeSchoolYear(event.currentTarget, focus, {
                  setEditTarget,
                  setSchoolYear,
                });
              }}
              value={schoolYear}
            >
              {schoolYears.map((year) => (
                <option key={year.schoolYear} value={year.schoolYear}>
                  {year.schoolYear}
                </option>
              ))}
            </select>
          </label>
        </div>
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
            Fach anlegen
          </button>
        ) : null}
      </div>
      {editTarget === null ? null : (
        <div className="mt-4">
          <FachForm
            pending={createMutation.isPending || updateMutation.isPending}
            error={formError}
            fach={editTarget === 'create' ? null : editTarget}
            formRef={focus.formRef}
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
            system={systemFor(schoolYears, schoolYear)}
            title={editTarget === 'create' ? 'Neues Fach' : 'Fach bearbeiten'}
          />
        </div>
      )}
      {queryState === 'pending' ? (
        <div className="mt-4">
          <LoadingHint text="Fächer werden geladen …" />
        </div>
      ) : null}
      {queryState === 'error' ? (
        <div className="mt-4">
          <QueryError
            onRetry={() => faecherQuery.refetch()}
            text="Die Fächer konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {queryState === 'success' && faecher !== undefined ? (
        <FachList
          archiveMutation={archiveMutation}
          faecher={faecher}
          onArchive={(id) => {
            archiveMutation.reset();
            archiveMutation.mutate(id);
          }}
          onEdit={(fach, trigger) => {
            focus.rememberTrigger(trigger);
            createMutation.reset();
            updateMutation.reset();
            setEditTarget(fach);
          }}
        />
      ) : null}
      {queryState === 'empty' && editTarget === null ? (
        <div className="mt-4 border border-border bg-surface-sunken p-6">
          <p className="text-ink-muted">
            Noch keine Fächer. Lege dein erstes Fach an — mit der Gewichtung,
            die die Lehrkraft verkündet hat.
          </p>
        </div>
      ) : null}
    </section>
  );
};
