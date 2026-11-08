import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { notenKey } from '#/shared/query/query-keys.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import { iconButtonClass, iconSize, iconStroke } from '#/shared/ui/icon.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import type { Leistung } from '../services/noten-service.ts';
import { NoteForm } from './note-form.tsx';
import type { PreparationLinkRenderer } from './note-row.tsx';
import { NotenCards } from './noten-cards.tsx';
import {
  closeIfSaved,
  emptyNotenHint,
  noUpdateErrors,
  updateErrorText,
  withNote,
  withoutNote,
} from './noten-list-model.ts';
import { notenMutationOptions } from './noten-mutations.ts';
import type { NotenOperations } from './noten-operations.ts';
import { usePendingUpdates } from './use-pending-updates.ts';

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

const preparationLink: PreparationLinkRenderer = (note, label) => (
  <Link
    aria-label={`Vorbereitung: ${label}`}
    className={iconButtonClass}
    params={{ id: note.id }}
    title={`Vorbereitung: ${label}`}
    to="/noten/$id"
  >
    <ListChecks aria-hidden={true} size={iconSize} strokeWidth={iconStroke} />
  </Link>
);

/**
 * A failed refresh keeps the list already shown, so an open edit stays mounted
 * with its unsaved input; this banner says the list may be out of date.
 */
const RefreshError = ({
  show,
  onRetry,
}: {
  readonly show: boolean;
  readonly onRetry: () => Promise<unknown>;
}) =>
  show ? (
    <div className="mt-6">
      <QueryError
        onRetry={onRetry}
        text="Die Notenliste konnte nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut."
      />
    </div>
  ) : null;

// Wer während des Neuladens anderswo weitergetippt hat, behält seinen Fokus.
const focusUnlessMoved = (
  origin: Element | null,
  target: HTMLElement | null,
) => {
  const active = document.activeElement;
  if (active === origin || active === document.body) {
    target?.focus();
  }
};

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
  const [editTarget, setEditTarget] = useState<Leistung | null>(null);
  const [updateErrors, setUpdateErrors] = useState(noUpdateErrors);
  const [deleteErrors, setDeleteErrors] = useState(noUpdateErrors);
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
  const deleteMutation = useMutation({
    ...options.delete,
    onError: (error: unknown, id: string) =>
      setDeleteErrors((errors) => withNote(errors, id, error)),
  });
  const { updateMutation, editPending } = usePendingUpdates(
    options.update,
    editTarget,
  );

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
  const retry = () => {
    const origin = document.activeElement;
    return notenQuery.refetch().then((result) => {
      if (result.isSuccess) {
        focusUnlessMoved(origin, focus.fallbackTriggerRef.current);
      }
    });
  };
  if (noten === undefined) {
    return shell(
      <div className="mt-6">
        <QueryError
          onRetry={retry}
          text="Die Notenliste konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
        />
      </div>,
    );
  }
  return shell(
    <>
      <RefreshError onRetry={retry} show={notenQuery.isError} />
      {noten.length === 0 ? (
        <div className="mt-6 border border-border bg-surface-sunken p-6">
          <p className="text-ink-muted">{emptyNotenHint(faecher.length > 0)}</p>
        </div>
      ) : (
        <NotenCards
          deleteErrors={deleteErrors}
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
            setDeleteErrors((errors) => withoutNote(errors, id));
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
          preparationLink={preparationLink}
          system={halbjahr.system}
          updateErrors={updateErrors}
        />
      )}
    </>,
  );
};
