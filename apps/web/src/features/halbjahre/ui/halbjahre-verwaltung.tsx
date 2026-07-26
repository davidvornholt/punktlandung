import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { determineQueryState } from '#/shared/ui/query-state-model.ts';
import type { HalbjahrEingabe } from '../schemas/halbjahr-schema.ts';
import {
  createHalbjahrFn,
  deleteHalbjahrFn,
  halbjahreQueryOptions,
  updateHalbjahrFn,
} from '../server/halbjahr-fns.ts';
import type { HalbjahrMitNotenAnzahl } from '../services/halbjahr-service.ts';
import { HalbjahrForm } from './halbjahr-form.tsx';
import { HalbjahrListe } from './halbjahr-liste.tsx';

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
  const queryClient = useQueryClient();
  const halbjahreAbfrage = useQuery(halbjahreQueryOptions);
  const [bearbeitung, setBearbeitung] = useState<
    HalbjahrMitNotenAnzahl | 'neu' | null
  >(null);
  const formularKennung = bearbeitungskennung(bearbeitung);
  const fokus = useFormFocus(formularKennung);

  const schliesseNachErfolg = () => {
    setBearbeitung(null);
    return queryClient.invalidateQueries({ queryKey: ['halbjahre'] });
  };
  const anlegen = useMutation({
    mutationFn: (werte: HalbjahrEingabe) => createHalbjahrFn({ data: werte }),
    onSuccess: schliesseNachErfolg,
  });
  const aendern = useMutation({
    mutationFn: (werte: HalbjahrEingabe & { readonly id: string }) =>
      updateHalbjahrFn({ data: werte }),
    onSuccess: schliesseNachErfolg,
  });
  const loeschen = useMutation({
    mutationFn: (id: string) => deleteHalbjahrFn({ data: { id } }),
    onSuccess: (_ergebnis, id) => {
      setBearbeitung((offen) =>
        offen !== null && offen !== 'neu' && offen.id === id ? null : offen,
      );
      // Mit dem letzten Halbjahr eines Schuljahrs entfällt dessen Fachstand.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['halbjahre'] }),
        queryClient.invalidateQueries({ queryKey: ['faecher'] }),
      ]);
    },
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
          loeschung={loeschen}
          onBearbeiten={(halbjahr, ausloeser) => {
            fokus.rememberTrigger(ausloeser);
            anlegen.reset();
            aendern.reset();
            setBearbeitung(halbjahr);
          }}
          onLoeschen={(id) => {
            loeschen.reset();
            loeschen.mutate(id);
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
