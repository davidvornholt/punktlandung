import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RefObject } from 'react';
import { useState } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { AbfrageFehler, Ladehinweis } from '#/shared/ui/abfrage-zustand.tsx';
import { aktionsfehlerText } from '#/shared/ui/aktionsfehler.ts';
import { useFormularFokus } from '#/shared/ui/formular-fokus.ts';
import type { ListenMutation } from '#/shared/ui/listen-mutation.ts';
import { listenMutationsanzeige } from '#/shared/ui/listen-mutation.ts';
import type { NoteAktualisierung } from '../schemas/note-schema.ts';
import {
  deleteNoteFn,
  notenQueryOptions,
  updateNoteFn,
} from '../server/noten-fns.ts';
import type { NoteMitFach } from '../services/noten-service.ts';
import { NoteForm } from './note-form.tsx';
import { aktualisiereNotenAbfragen } from './noten-aktualisierung.ts';
import { NotenKarten } from './noten-karten.tsx';

type Halbjahr = {
  readonly id: string;
  readonly system: Notensystem;
  readonly startsOn: string;
  readonly endsOn: string;
};

type Fachliste = ReadonlyArray<{
  readonly id: string;
  readonly name: string;
}>;

/**
 * Das Bearbeitungsformular einer Note. Ladezustand und Fehler stammen aus der
 * geteilten Änderungsmutation, gelten aber nur, wenn diese gerade zu dieser
 * Note gehört: sonst zeigte ein Speichervorgang für eine andere Note hier
 * seinen Zustand an.
 */
const NoteBearbeitung = ({
  aenderung,
  faecher,
  formularRef,
  note,
  onAbbrechen,
  onSpeichern,
  term,
}: {
  readonly aenderung: ListenMutation<string>;
  readonly faecher: Fachliste;
  readonly formularRef: RefObject<HTMLFormElement | null>;
  readonly note: NoteMitFach;
  readonly onAbbrechen: () => void;
  readonly onSpeichern: (werte: NoteAktualisierung) => void;
  readonly term: Halbjahr;
}) => {
  const anzeige = listenMutationsanzeige(aenderung, note.id);
  return (
    <NoteForm
      beschaeftigt={anzeige.laeuft}
      faecher={faecher}
      fehler={
        anzeige.fehler === null
          ? null
          : aktionsfehlerText(
              anzeige.fehler,
              'Die Note konnte nicht geändert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
            )
      }
      formularRef={formularRef}
      note={note}
      onAbbrechen={onAbbrechen}
      onSpeichern={(werte) => onSpeichern({ ...werte, id: note.id })}
      term={term}
    />
  );
};

export const Notenliste = ({
  term,
  faecher,
}: {
  readonly term: Halbjahr;
  readonly faecher: Fachliste;
}) => {
  const queryClient = useQueryClient();
  const notenAbfrage = useQuery(notenQueryOptions(term.id));
  const [bearbeitung, setBearbeitung] = useState<NoteMitFach | null>(null);
  const fokus = useFormularFokus<HTMLElement>(bearbeitung?.id ?? null);

  const loeschen = useMutation({
    mutationFn: (id: string) => deleteNoteFn({ data: { id } }),
    onSuccess: () => aktualisiereNotenAbfragen(queryClient, term.id),
  });
  const aendern = useMutation({
    mutationFn: (werte: NoteAktualisierung) => updateNoteFn({ data: werte }),
    /*
     * Erst die Listen erneuern, dann schließen: schließt das Formular vorher,
     * gibt die Fokusrückgabe den Fokus an den Zeilenknopf, den der folgende
     * Neuabruf entfernt, sobald die Note in ein anderes Fach gewandert ist.
     * Geschlossen wird nur die Bearbeitung, die dieser Vorgang betraf — der
     * Benutzer kann inzwischen eine andere Note geöffnet haben.
     */
    onSuccess: (_ergebnis, werte) =>
      aktualisiereNotenAbfragen(queryClient, term.id).then(() => {
        setBearbeitung((offen) => (offen?.id === werte.id ? null : offen));
      }),
  });
  const aenderung: ListenMutation<string> = {
    error: aendern.error,
    isError: aendern.isError,
    isPending: aendern.isPending,
    variables: aendern.variables?.id,
  };

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
    /*
     * Auffangziel für den Fokus: der Zeilenknopf, der das Formular geöffnet
     * hat, verschwindet mit dem Neuabruf, wenn die Note ihr Fach gewechselt
     * hat. Ohne dieses Ziel landete der Fokus auf <body>.
     */
    <section
      aria-label="Notenliste"
      ref={fokus.ersatzAusloeserRef}
      tabIndex={-1}
    >
      <NotenKarten
        aenderung={aenderung}
        bearbeitungId={bearbeitung?.id ?? null}
        formular={
          bearbeitung === null ? null : (
            <NoteBearbeitung
              aenderung={aenderung}
              faecher={faecher}
              formularRef={fokus.formularRef}
              key={bearbeitung.id}
              note={bearbeitung}
              onAbbrechen={() => setBearbeitung(null)}
              onSpeichern={(werte) => {
                aendern.reset();
                aendern.mutate(werte);
              }}
              term={term}
            />
          )
        }
        loeschung={loeschen}
        noten={noten}
        onBearbeiten={(note, ausloeser) => {
          fokus.merkeAusloeser(ausloeser);
          setBearbeitung(note);
        }}
        onLoeschen={(id) => {
          loeschen.reset();
          loeschen.mutate(id);
        }}
        system={term.system}
      />
    </section>
  );
};
