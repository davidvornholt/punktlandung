import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
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

type UpdateErrors = ReadonlyMap<string, unknown>;

const noUpdateErrors: UpdateErrors = new Map();

const withoutNote = (errors: UpdateErrors, id: string): UpdateErrors => {
  const rest = new Map(errors);
  rest.delete(id);
  return rest;
};

const updateErrorText = (error: unknown) =>
  error === undefined
    ? null
    : actionErrorText(
        error,
        'Die Note konnte nicht geändert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
      );

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
  /*
   * Gescheiterte Änderungen, je Note festgehalten. Die geteilte Mutation kennt
   * nur ihren letzten Ausgang: das Speichern einer zweiten Note verwarf sonst
   * den Fehler der ersten, und diese bliebe stillschweigend ungeändert.
   */
  const [updateErrors, setUpdateErrors] =
    useState<UpdateErrors>(noUpdateErrors);
  const focus = useFormFocus<HTMLElement>(editTarget?.id ?? null);

  const forgetUpdateError = (id: string) =>
    setUpdateErrors((errors) => withoutNote(errors, id));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNoteFn({ data: { id } }),
    /*
     * Mit der gelöschten Zeile verschwindet ihr Löschknopf; ohne das
     * Auffangziel fiele der Fokus auf <body>.
     */
    onSuccess: (_result, id) =>
      invalidateNotenQueries(queryClient, halbjahr.id).then(() => {
        forgetUpdateError(id);
        focus.fallbackTriggerRef.current?.focus();
      }),
  });
  const updateMutation = useMutation({
    mutationFn: (values: NoteUpdate) => updateNoteFn({ data: values }),
    onError: (error, values) =>
      setUpdateErrors((errors) => new Map(errors).set(values.id, error)),
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

  /** Läuft gerade das Speichern der offenen Bearbeitung? */
  const editPending =
    updateMutation.isPending &&
    editTarget !== null &&
    updateMutation.variables?.id === editTarget.id;

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
     * hat oder gelöscht wurde. Ohne dieses Ziel landete der Fokus auf <body>.
     */
    <section
      aria-label="Notenliste"
      ref={focus.fallbackTriggerRef}
      tabIndex={-1}
    >
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
      />
    </section>
  );
};
