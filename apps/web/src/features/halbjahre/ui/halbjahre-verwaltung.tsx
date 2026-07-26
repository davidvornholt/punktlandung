import { useQuery } from '@tanstack/react-query';
import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { determineQueryState } from '#/shared/ui/query-state-model.ts';
import { halbjahreQueryOptions } from '../server/halbjahr-fns.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import type { HalbjahrDeletionRequest } from './halbjahr-deletion-model.ts';
import {
  halbjahrDeletionSuccessMessage,
  restoreHalbjahrDeletionFocus,
} from './halbjahr-deletion-model.ts';
import { HalbjahrForm } from './halbjahr-form.tsx';
import { HalbjahrListe } from './halbjahr-liste.tsx';
import { useHalbjahrMutations } from './halbjahr-mutations.ts';

const bearbeitungskennung = (
  bearbeitung: HalbjahrWithNotenCount | 'neu' | null,
) => {
  if (bearbeitung === null || bearbeitung === 'neu') {
    return bearbeitung;
  }
  return bearbeitung.id;
};

const halbjahrFormularFehler = (
  anlegen: { readonly error: unknown; readonly isError: boolean },
  aendern: { readonly error: unknown; readonly isError: boolean },
): string | null => {
  if (anlegen.isError) {
    return actionErrorText(
      anlegen.error,
      'Das Halbjahr konnte nicht angelegt werden. Prüfe die Verbindung und versuche es erneut.',
    );
  }
  if (aendern.isError) {
    return actionErrorText(
      aendern.error,
      'Das Halbjahr konnte nicht geändert werden. Die Eingaben bleiben erhalten; versuche es erneut.',
    );
  }
  return null;
};

const useHalbjahrDeletionCompletion = (
  formRef: RefObject<HTMLFormElement | null>,
  createTriggerRef: RefObject<HTMLButtonElement | null>,
) => {
  const [status, setStatus] = useState<{
    readonly message: string;
    readonly sequence: number;
  } | null>(null);
  const completedRequestRef = useRef<HalbjahrDeletionRequest | null>(null);
  useEffect(() => {
    if (status === null) {
      return;
    }
    const request = completedRequestRef.current;
    if (request !== null) {
      restoreHalbjahrDeletionFocus({
        activeElement: document.activeElement,
        adjacentTarget: request.adjacentFocusTarget,
        createTrigger: createTriggerRef.current,
        deletionTrigger: request.deletionTrigger,
        formControl:
          formRef.current?.querySelector<HTMLElement>(
            'input, select, textarea, button',
          ) ?? null,
      });
      completedRequestRef.current = null;
    }
  }, [createTriggerRef, formRef, status]);
  return {
    complete: (request: HalbjahrDeletionRequest) => {
      completedRequestRef.current = request;
      setStatus((current) => ({
        message: halbjahrDeletionSuccessMessage(request.halbjahr),
        sequence: (current?.sequence ?? 0) + 1,
      }));
    },
    message: status?.message ?? '',
  };
};

export const HalbjahreVerwaltung = () => {
  const halbjahreAbfrage = useQuery(halbjahreQueryOptions);
  const [bearbeitung, setBearbeitung] = useState<
    HalbjahrWithNotenCount | 'neu' | null
  >(null);
  const formularKennung = bearbeitungskennung(bearbeitung);
  const fokus = useFormFocus(formularKennung);
  const deletionCompletion = useHalbjahrDeletionCompletion(
    fokus.formRef,
    fokus.fallbackTriggerRef,
  );

  const { createMutation, deleteMutation, updateMutation } =
    useHalbjahrMutations({
      onDeleted: (request) => {
        const { halbjahr } = request;
        setBearbeitung((currentEditor) =>
          currentEditor !== null &&
          currentEditor !== 'neu' &&
          currentEditor.id === halbjahr.id
            ? null
            : currentEditor,
        );
        deletionCompletion.complete(request);
      },
      onEditorClose: () => setBearbeitung(null),
    });
  const halbjahre = halbjahreAbfrage.data;
  const queryState = determineQueryState({
    data: halbjahre,
    isError: halbjahreAbfrage.isError,
    isPending: halbjahreAbfrage.isPending,
    isEmpty: (werte) => werte.length === 0,
  });
  const formularFehler = halbjahrFormularFehler(createMutation, updateMutation);

  return (
    <section>
      <p className="sr-only" role="status">
        {deletionCompletion.message}
      </p>
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl text-ink tracking-tight">
          Halbjahre
        </h2>
        {bearbeitung === null ? (
          <button
            className={primaryButtonClass}
            onClick={(ereignis) => {
              fokus.rememberTrigger(ereignis.currentTarget);
              createMutation.reset();
              updateMutation.reset();
              setBearbeitung('neu');
            }}
            ref={fokus.fallbackTriggerRef}
            type="button"
          >
            Halbjahr anlegen
          </button>
        ) : null}
      </div>
      {bearbeitung === null ? null : (
        <div className="mt-4">
          <HalbjahrForm
            beschaeftigt={createMutation.isPending || updateMutation.isPending}
            fehler={formularFehler}
            formRef={fokus.formRef}
            halbjahr={bearbeitung === 'neu' ? null : bearbeitung}
            halbjahre={halbjahre ?? []}
            heute={berlinCalendarDate()}
            key={formularKennung}
            onAbbrechen={() => setBearbeitung(null)}
            onSpeichern={(werte) => {
              if (bearbeitung === 'neu') {
                createMutation.reset();
                createMutation.mutate(werte);
              } else {
                updateMutation.reset();
                updateMutation.mutate({ ...werte, id: bearbeitung.id });
              }
            }}
            titel={
              bearbeitung === 'neu' ? 'Neues Halbjahr' : 'Halbjahr bearbeiten'
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
            onRetry={() => halbjahreAbfrage.refetch()}
            text="Die Halbjahre konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {queryState === 'success' && halbjahre !== undefined ? (
        <HalbjahrListe
          halbjahre={halbjahre}
          deletion={{
            error: deleteMutation.error,
            isError: deleteMutation.isError,
            isPending: deleteMutation.isPending,
            variables: deleteMutation.variables?.halbjahr.id,
          }}
          onBearbeiten={(halbjahr, trigger) => {
            fokus.rememberTrigger(trigger);
            createMutation.reset();
            updateMutation.reset();
            setBearbeitung(halbjahr);
          }}
          onDelete={(request) => {
            deleteMutation.reset();
            deleteMutation.mutate(request);
          }}
        />
      ) : null}
      {queryState === 'empty' && bearbeitung === null ? (
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
