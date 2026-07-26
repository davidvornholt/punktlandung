import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { determineQueryState } from '#/shared/ui/query-state-model.ts';
import { halbjahreQueryOptions } from '../server/halbjahr-fns.ts';
import type { HalbjahrMitNotenAnzahl } from '../services/halbjahr-service.ts';
import {
  halbjahrDeletionSuccessMessage,
  restoreHalbjahrDeletionFocus,
} from './halbjahr-deletion-model.ts';
import { HalbjahrForm } from './halbjahr-form.tsx';
import { HalbjahrListe } from './halbjahr-liste.tsx';
import { useHalbjahrMutations } from './halbjahr-mutations.ts';

const bearbeitungskennung = (
  bearbeitung: HalbjahrMitNotenAnzahl | 'neu' | null,
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

export const HalbjahreVerwaltung = () => {
  const halbjahreAbfrage = useQuery(halbjahreQueryOptions);
  const [bearbeitung, setBearbeitung] = useState<
    HalbjahrMitNotenAnzahl | 'neu' | null
  >(null);
  const [deletionStatus, setDeletionStatus] = useState('');
  const deletionFocusTargetRef = useRef<HTMLButtonElement | null>(null);
  const formularKennung = bearbeitungskennung(bearbeitung);
  const fokus = useFormFocus(formularKennung);

  useEffect(() => {
    if (deletionStatus !== '') {
      restoreHalbjahrDeletionFocus(
        deletionFocusTargetRef.current,
        fokus.fallbackTriggerRef.current,
      );
    }
  }, [deletionStatus, fokus.fallbackTriggerRef]);

  const { aendern, anlegen, loeschen } = useHalbjahrMutations({
    onDeleted: (request) => {
      const { halbjahr } = request;
      deletionFocusTargetRef.current = request.focusTarget;
      setBearbeitung((offen) =>
        offen !== null && offen !== 'neu' && offen.id === halbjahr.id
          ? null
          : offen,
      );
      setDeletionStatus(halbjahrDeletionSuccessMessage(halbjahr));
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
  const formularFehler = halbjahrFormularFehler(anlegen, aendern);

  return (
    <section>
      <p className="sr-only" role="status">
        {deletionStatus}
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
              anlegen.reset();
              aendern.reset();
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
            beschaeftigt={anlegen.isPending || aendern.isPending}
            fehler={formularFehler}
            formRef={fokus.formRef}
            halbjahr={bearbeitung === 'neu' ? null : bearbeitung}
            halbjahre={halbjahre ?? []}
            heute={berlinCalendarDate()}
            key={formularKennung}
            onAbbrechen={() => setBearbeitung(null)}
            onSpeichern={(werte) => {
              if (bearbeitung === 'neu') {
                anlegen.reset();
                anlegen.mutate(werte);
              } else {
                aendern.reset();
                aendern.mutate({ ...werte, id: bearbeitung.id });
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
          loeschung={{
            error: loeschen.error,
            isError: loeschen.isError,
            isPending: loeschen.isPending,
            variables: loeschen.variables?.halbjahr.id,
          }}
          onBearbeiten={(halbjahr, ausloeser) => {
            fokus.rememberTrigger(ausloeser);
            anlegen.reset();
            aendern.reset();
            setBearbeitung(halbjahr);
          }}
          onLoeschen={(request) => {
            loeschen.reset();
            loeschen.mutate(request);
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
