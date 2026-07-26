import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { AbfrageFehler, Ladehinweis } from '#/shared/ui/abfrage-zustand.tsx';
import { aktionsfehlerText } from '#/shared/ui/aktionsfehler.ts';
import { useFormularFokus } from '#/shared/ui/formular-fokus.ts';
import type { NotenFelder } from '../schemas/note-schema.ts';
import {
  deleteNoteFn,
  notenQueryOptions,
  updateNoteFn,
} from '../server/noten-fns.ts';
import type { NoteMitFach } from '../services/noten-service.ts';
import { NoteForm } from './note-form.tsx';
import { NotenKarten } from './noten-karten.tsx';

export const Notenliste = ({
  term,
  faecher,
}: {
  readonly term: {
    readonly id: string;
    readonly system: Notensystem;
    readonly startsOn: string;
    readonly endsOn: string;
  };
  readonly faecher: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
}) => {
  const queryClient = useQueryClient();
  const notenAbfrage = useQuery(notenQueryOptions(term.id));
  const [bearbeitung, setBearbeitung] = useState<NoteMitFach | null>(null);
  const fokus = useFormularFokus(bearbeitung?.id ?? null);

  const aktualisiereListen = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['noten', term.id] }),
      queryClient.invalidateQueries({ queryKey: ['verlauf'] }),
    ]);
  const loeschen = useMutation({
    mutationFn: (id: string) => deleteNoteFn({ data: { id } }),
    onSuccess: aktualisiereListen,
  });
  const aendern = useMutation({
    mutationFn: (werte: NotenFelder & { readonly id: string }) =>
      updateNoteFn({ data: werte }),
    onSuccess: () => {
      setBearbeitung(null);
      return aktualisiereListen();
    },
  });

  const noten = notenAbfrage.data;
  if (notenAbfrage.isPending) {
    return (
      <div className="mt-6">
        <Ladehinweis text="Notenliste wird geladen …" />
      </div>
    );
  }
  if (notenAbfrage.isError || noten === undefined) {
    return (
      <div className="mt-6">
        <AbfrageFehler
          onWiederholen={() => notenAbfrage.refetch()}
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
    <NotenKarten
      bearbeitungId={bearbeitung?.id ?? null}
      formular={
        bearbeitung === null ? null : (
          <NoteForm
            beschaeftigt={aendern.isPending}
            faecher={faecher}
            fehler={
              aendern.isError
                ? aktionsfehlerText(
                    aendern.error,
                    'Die Note konnte nicht geändert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
                  )
                : null
            }
            formularRef={fokus.formularRef}
            key={bearbeitung.id}
            note={bearbeitung}
            onAbbrechen={() => setBearbeitung(null)}
            onSpeichern={(werte) => {
              aendern.reset();
              aendern.mutate({ ...werte, id: bearbeitung.id });
            }}
            term={term}
            vorgabeDatum={bearbeitung.datum}
          />
        )
      }
      loeschung={loeschen}
      noten={noten}
      onBearbeiten={(note, ausloeser) => {
        fokus.merkeAusloeser(ausloeser);
        aendern.reset();
        setBearbeitung(note);
      }}
      onLoeschen={(id) => {
        loeschen.reset();
        loeschen.mutate(id);
      }}
      system={term.system}
    />
  );
};
