import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AbfrageFehler, Ladehinweis } from '#/shared/ui/abfrage-zustand.tsx';
import { bestimmeAbfrageZustand } from '#/shared/ui/abfrage-zustand-modell.ts';
import { aktionsfehlerText } from '#/shared/ui/aktionsfehler.ts';
import { primaerKnopfKlasse } from '#/shared/ui/form-klassen.ts';
import { useFormularFokus } from '#/shared/ui/formular-fokus.ts';
import type { HalbjahrEingabe } from '../schemas/halbjahr-schema.ts';
import {
  createHalbjahrFn,
  halbjahreQueryOptions,
  updateHalbjahrFn,
} from '../server/halbjahr-fns.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';
import { HalbjahrForm } from './halbjahr-form.tsx';
import { HalbjahrListe } from './halbjahr-liste.tsx';

const bearbeitungskennung = (bearbeitung: Halbjahr | 'neu' | null) => {
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
    return aktionsfehlerText(
      anlegen.error,
      'Das Halbjahr konnte nicht angelegt werden. Prüfe die Verbindung und versuche es erneut.',
    );
  }
  if (aendern.isError) {
    return aktionsfehlerText(
      aendern.error,
      'Das Halbjahr konnte nicht geändert werden. Die Eingaben bleiben erhalten; versuche es erneut.',
    );
  }
  return null;
};

export const HalbjahreVerwaltung = () => {
  const queryClient = useQueryClient();
  const halbjahreAbfrage = useQuery(halbjahreQueryOptions);
  const [bearbeitung, setBearbeitung] = useState<Halbjahr | 'neu' | null>(null);
  const formularKennung = bearbeitungskennung(bearbeitung);
  const fokus = useFormularFokus(formularKennung);

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
  const halbjahre = halbjahreAbfrage.data;
  const abfrageZustand = bestimmeAbfrageZustand({
    data: halbjahre,
    isError: halbjahreAbfrage.isError,
    isPending: halbjahreAbfrage.isPending,
    istLeer: (werte) => werte.length === 0,
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
            className={primaerKnopfKlasse}
            onClick={(ereignis) => {
              fokus.merkeAusloeser(ereignis.currentTarget);
              anlegen.reset();
              aendern.reset();
              setBearbeitung('neu');
            }}
            ref={fokus.ersatzAusloeserRef}
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
            formularRef={fokus.formularRef}
            halbjahr={bearbeitung === 'neu' ? null : bearbeitung}
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
      {abfrageZustand === 'ausstehend' ? (
        <div className="mt-4">
          <Ladehinweis text="Halbjahre werden geladen …" />
        </div>
      ) : null}
      {abfrageZustand === 'fehler' ? (
        <div className="mt-4">
          <AbfrageFehler
            onWiederholen={() => halbjahreAbfrage.refetch()}
            text="Die Halbjahre konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {abfrageZustand === 'erfolg' && halbjahre !== undefined ? (
        <HalbjahrListe
          halbjahre={halbjahre}
          onBearbeiten={(halbjahr, ausloeser) => {
            fokus.merkeAusloeser(ausloeser);
            anlegen.reset();
            aendern.reset();
            setBearbeitung(halbjahr);
          }}
        />
      ) : null}
      {abfrageZustand === 'leer' && bearbeitung === null ? (
        <div className="mt-4 border border-border bg-surface-sunken p-6">
          <p className="text-ink-muted">
            Noch keine Halbjahre. Lege zuerst das laufende Halbjahr an — mit
            Zeitraum und Notensystem.
          </p>
        </div>
      ) : null}
    </section>
  );
};
