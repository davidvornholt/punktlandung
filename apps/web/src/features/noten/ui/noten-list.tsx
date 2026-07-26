import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { notenKey } from '#/shared/query/query-keys.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import type { NoteWithFach } from '../services/noten-service.ts';
import { NoteForm } from './note-form.tsx';
import { NotenCards } from './noten-cards.tsx';
import {
  closeIfSaved,
  emptyNotenHint,
  isEditPending,
  noUpdateErrors,
  updateErrorText,
  withNote,
  withoutNote,
} from './noten-list-model.ts';
import { notenMutationOptions } from './noten-mutations.ts';
import type { NotenOperations } from './noten-operations.ts';

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

export const NotenList = ({
  halbjahr,
  faecher,
  operations,
}: {
  readonly halbjahr: Halbjahr;
  readonly faecher: FachList;
  readonly operations: NotenOperations;
}) => {
  const queryClient = useQueryClient();
  const notenQuery = useQuery({
    queryFn: () => operations.list(halbjahr.id),
    queryKey: notenKey(halbjahr.id),
  });
  const [editTarget, setEditTarget] = useState<NoteWithFach | null>(null);
  const [updateErrors, setUpdateErrors] = useState(noUpdateErrors);
  const focus = useFormFocus<HTMLElement>(editTarget?.id ?? null);

  const forgetUpdateError = (id: string) =>
    setUpdateErrors((errors) => withoutNote(errors, id));

  const options = notenMutationOptions({
    halbjahrId: halbjahr.id,
    /*
     * Mit der gelöschten Zeile verschwindet ihr Löschknopf; ohne das
     * Auffangziel fiele der Fokus auf <body>.
     */
    onDeleted: (id) => {
      forgetUpdateError(id);
      focus.fallbackTriggerRef.current?.focus();
    },
    onUpdated: (id) => setEditTarget(closeIfSaved(id)),
    onUpdateFailed: (id, error) =>
      setUpdateErrors((errors) => withNote(errors, id, error)),
    operations,
    queryClient,
  });
  const deleteMutation = useMutation(options.delete);
  const updateMutation = useMutation(options.update);
  const editPending = isEditPending(updateMutation, editTarget);

  /*
   * Auffangziel für den Fokus: der Zeilenknopf, der das Formular geöffnet hat,
   * verschwindet mit dem Neuabruf, wenn die Note ihr Fach gewechselt hat oder
   * gelöscht wurde. Ohne dieses Ziel landete der Fokus auf <body>. Der
   * Abschnitt trägt deshalb jeden Zustand der Liste: wer ihre letzte Note
   * löscht, sieht danach die leere Liste — und das Auffangziel muss auch dann
   * noch dastehen.
   */
  const shell = (children: ReactNode) => (
    <section
      aria-label="Notenliste"
      ref={focus.fallbackTriggerRef}
      tabIndex={-1}
    >
      {children}
    </section>
  );

  const noten = notenQuery.data;
  if (notenQuery.isPending) {
    return shell(
      <div className="mt-6">
        <LoadingHint text="Notenliste wird geladen …" />
      </div>,
    );
  }
  if (notenQuery.isError || noten === undefined) {
    return shell(
      <div className="mt-6">
        <QueryError
          onRetry={() => notenQuery.refetch()}
          text="Die Notenliste konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
        />
      </div>,
    );
  }
  if (noten.length === 0) {
    return shell(
      <div className="mt-6 border border-border bg-surface-sunken p-6">
        <p className="text-ink-muted">{emptyNotenHint(faecher.length > 0)}</p>
      </div>,
    );
  }

  return shell(
    <NotenCards
      deleteMutation={deleteMutation}
      editNoteId={editTarget?.id ?? null}
      editPending={editPending}
      form={
        editTarget === null ? null : (
          <NoteForm
            error={updateErrorText(updateErrors.get(editTarget.id))}
            faecher={faecher}
            formRef={focus.formRef}
            halbjahr={halbjahr}
            key={editTarget.id}
            note={editTarget}
            onCancel={() => setEditTarget(null)}
            onSave={(values) => {
              forgetUpdateError(editTarget.id);
              updateMutation.mutate({ ...values, id: editTarget.id });
            }}
            pending={editPending}
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
        /*
         * Wer eine gescheiterte Note erneut öffnet, hat den Fehler gesehen;
         * er darf weder das frische Formular noch die wieder geschlossene
         * Zeile weiter behaupten.
         */
        if (note !== null) {
          forgetUpdateError(note.id);
        }
        setEditTarget(note);
      }}
      system={halbjahr.system}
      updateErrors={updateErrors}
    />,
  );
};
