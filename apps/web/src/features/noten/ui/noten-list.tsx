import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RefObject } from 'react';
import { useState } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import type { NoteUpdate } from '../schemas/note-schema.ts';
import {
  deleteNoteFn,
  notenQueryOptions,
  updateNoteFn,
} from '../server/noten-fns.ts';
import type { NoteWithFach } from '../services/noten-service.ts';
import { NoteForm } from './note-form.tsx';
import { NotenCards } from './noten-cards.tsx';
import { invalidateNotenQueries } from './noten-invalidation.ts';

type Halbjahr = {
  readonly id: string;
  readonly system: Notensystem;
  readonly startsOn: string;
  readonly endsOn: string;
};

type FachList = ReadonlyArray<{
  readonly id: string;
  readonly name: string;
}>;

/**
 * Das Bearbeitungsformular einer Note. Ladezustand und Fehler stammen aus der
 * geteilten Änderungsmutation, gelten aber nur, wenn diese gerade zu dieser
 * Note gehört: sonst zeigte ein Speichervorgang für eine andere Note hier
 * seinen Zustand an.
 */
const NoteEditForm = ({
  faecher,
  formRef,
  halbjahr,
  note,
  onCancel,
  onSave,
  updateMutation,
}: {
  readonly faecher: FachList;
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly halbjahr: Halbjahr;
  readonly note: NoteWithFach;
  readonly onCancel: () => void;
  readonly onSave: (values: NoteUpdate) => void;
  readonly updateMutation: ListMutation<string>;
}) => {
  const state = listMutationState(updateMutation, note.id);
  return (
    <NoteForm
      error={
        state.error === null
          ? null
          : actionErrorText(
              state.error,
              'Die Note konnte nicht geändert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
            )
      }
      faecher={faecher}
      formRef={formRef}
      halbjahr={halbjahr}
      note={note}
      onCancel={onCancel}
      onSave={(values) => onSave({ ...values, id: note.id })}
      pending={state.pending}
    />
  );
};

export const NotenList = ({
  halbjahr,
  faecher,
}: {
  readonly halbjahr: Halbjahr;
  readonly faecher: FachList;
}) => {
  const queryClient = useQueryClient();
  const notenQuery = useQuery(notenQueryOptions(halbjahr.id));
  const [editTarget, setEditTarget] = useState<NoteWithFach | null>(null);
  const focus = useFormFocus<HTMLElement>(editTarget?.id ?? null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNoteFn({ data: { id } }),
    onSuccess: () => invalidateNotenQueries(queryClient, halbjahr.id),
  });
  const updateMutation = useMutation({
    mutationFn: (values: NoteUpdate) => updateNoteFn({ data: values }),
    /*
     * Erst die Listen erneuern, dann schließen: schließt das Formular vorher,
     * gibt die Fokusrückgabe den Fokus an den Zeilenknopf, den der folgende
     * Neuabruf entfernt, sobald die Note in ein anderes Fach gewandert ist.
     * Geschlossen wird nur die Bearbeitung, die dieser Vorgang betraf — der
     * Benutzer kann inzwischen eine andere Note geöffnet haben.
     */
    onSuccess: (_result, values) =>
      invalidateNotenQueries(queryClient, halbjahr.id).then(() => {
        setEditTarget((open) => (open?.id === values.id ? null : open));
      }),
  });
  const updateState: ListMutation<string> = {
    error: updateMutation.error,
    isError: updateMutation.isError,
    isPending: updateMutation.isPending,
    variables: updateMutation.variables?.id,
  };

  const noten = notenQuery.data;
  if (notenQuery.isPending) {
    return (
      <div className="mt-6">
        <LoadingHint text="Notenliste wird geladen …" />
      </div>
    );
  }
  if (notenQuery.isError || noten === undefined) {
    return (
      <div className="mt-6">
        <QueryError
          onRetry={() => notenQuery.refetch()}
          text="Die Notenliste konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
        />
      </div>
    );
  }
  if (noten.length === 0) {
    return (
      <div className="mt-6 border border-border bg-surface-sunken p-6">
        <p className="text-ink-muted">
          In diesem Halbjahr sind noch keine Noten eingetragen. Nutze die
          Eintragsleiste oben, sobald die erste Note zurückkommt.
        </p>
      </div>
    );
  }

  return (
    /*
     * Auffangziel für den Fokus: der Zeilenknopf, der das Formular geöffnet
     * hat, verschwindet mit dem Neuabruf, wenn die Note ihr Fach gewechselt
     * hat. Ohne dieses Ziel landete der Fokus auf <body>.
     */
    <section
      aria-label="Notenliste"
      ref={focus.fallbackTriggerRef}
      tabIndex={-1}
    >
      <NotenCards
        deleteMutation={deleteMutation}
        editNoteId={editTarget?.id ?? null}
        form={
          editTarget === null ? null : (
            <NoteEditForm
              faecher={faecher}
              formRef={focus.formRef}
              halbjahr={halbjahr}
              key={editTarget.id}
              note={editTarget}
              onCancel={() => setEditTarget(null)}
              onSave={(values) => {
                updateMutation.reset();
                updateMutation.mutate(values);
              }}
              updateMutation={updateState}
            />
          )
        }
        noten={noten}
        onDelete={(id) => {
          deleteMutation.reset();
          deleteMutation.mutate(id);
        }}
        onEdit={(note, trigger) => {
          focus.rememberTrigger(trigger);
          setEditTarget(note);
        }}
        system={halbjahr.system}
        updateMutation={updateState}
      />
    </section>
  );
};
