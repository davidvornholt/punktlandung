import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AbfrageFehler, Ladehinweis } from '#/shared/ui/abfrage-zustand.tsx';
import { bestimmeAbfrageZustand } from '#/shared/ui/abfrage-zustand-modell.ts';
import { aktionsfehlerText } from '#/shared/ui/aktionsfehler.ts';
import {
  eingabeKlasse,
  labelKlasse,
  primaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import { useFormularFokus } from '#/shared/ui/formular-fokus.ts';
import type { FachFelder } from '../schemas/fach-schema.ts';
import {
  archiveFachFn,
  createFachFn,
  faecherQueryOptions,
  updateFachFn,
} from '../server/fach-fns.ts';
import type { Fach } from '../services/fach-service.ts';
import { FachForm } from './fach-form.tsx';
import { FachListe } from './fach-liste.tsx';

const bearbeitungskennung = (bearbeitung: Fach | 'neu' | null) => {
  if (bearbeitung === null || bearbeitung === 'neu') {
    return bearbeitung;
  }
  return bearbeitung.id;
};

const fachFormularFehler = (
  anlegen: { readonly error: unknown; readonly isError: boolean },
  aendern: { readonly error: unknown; readonly isError: boolean },
): string | null => {
  if (anlegen.isError) {
    return aktionsfehlerText(
      anlegen.error,
      'Das Fach konnte nicht angelegt werden. Prüfe die Verbindung und versuche es erneut.',
    );
  }
  if (aendern.isError) {
    return aktionsfehlerText(
      aendern.error,
      'Das Fach konnte nicht geändert werden. Die Eingaben bleiben erhalten; versuche es erneut.',
    );
  }
  return null;
};

export const FaecherVerwaltung = ({
  schoolYears,
}: {
  readonly schoolYears: ReadonlyArray<string>;
}) => {
  const queryClient = useQueryClient();
  const [schoolYear, setSchoolYear] = useState(schoolYears[0] ?? '');
  const faecherAbfrage = useQuery({
    ...faecherQueryOptions(schoolYear),
    enabled: schoolYear !== '',
  });
  const [bearbeitung, setBearbeitung] = useState<Fach | 'neu' | null>(null);
  const formularKennung = bearbeitungskennung(bearbeitung);
  const fokus = useFormularFokus(formularKennung);

  const schliesseNachErfolg = () => {
    setBearbeitung(null);
    return queryClient.invalidateQueries({
      queryKey: ['faecher', schoolYear],
    });
  };
  const anlegen = useMutation({
    mutationFn: (werte: FachFelder) =>
      createFachFn({ data: { ...werte, schoolYear } }),
    onSuccess: schliesseNachErfolg,
  });
  const aendern = useMutation({
    mutationFn: (werte: FachFelder & { readonly id: string }) =>
      updateFachFn({ data: { ...werte, schoolYear } }),
    onSuccess: schliesseNachErfolg,
  });
  const archivieren = useMutation({
    mutationFn: (id: string) => archiveFachFn({ data: { id, schoolYear } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['faecher', schoolYear] }),
  });
  const faecher = faecherAbfrage.data;
  const abfrageZustand = bestimmeAbfrageZustand({
    data: faecher,
    isError: faecherAbfrage.isError,
    isPending: faecherAbfrage.isPending,
    istLeer: (werte) => werte.length === 0,
  });
  const formularFehler = fachFormularFehler(anlegen, aendern);

  if (schoolYear === '') {
    return (
      <section className="border border-border bg-surface-sunken p-6">
        <h2 className="font-display text-2xl text-ink tracking-tight">
          Fächer
        </h2>
        <p className="mt-2 text-ink-muted">
          Lege zuerst ein Halbjahr an. Danach verwaltest du die Fächer für das
          zugehörige Schuljahr.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ink tracking-tight">
            Fächer {schoolYear}
          </h2>
          <label className={`${labelKlasse} mt-3 max-w-xs`}>
            Schuljahr
            <select
              className={eingabeKlasse}
              onChange={(ereignis) => {
                fokus.merkeAusloeser(ereignis.currentTarget);
                setBearbeitung(null);
                setSchoolYear(ereignis.currentTarget.value);
              }}
              value={schoolYear}
            >
              {schoolYears.map((jahr) => (
                <option key={jahr} value={jahr}>
                  {jahr}
                </option>
              ))}
            </select>
          </label>
        </div>
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
            Fach anlegen
          </button>
        ) : null}
      </div>
      {bearbeitung === null ? null : (
        <div className="mt-4">
          <FachForm
            beschaeftigt={anlegen.isPending || aendern.isPending}
            fehler={formularFehler}
            fach={bearbeitung === 'neu' ? null : bearbeitung}
            formularRef={fokus.formularRef}
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
            titel={bearbeitung === 'neu' ? 'Neues Fach' : 'Fach bearbeiten'}
          />
        </div>
      )}
      {abfrageZustand === 'ausstehend' ? (
        <div className="mt-4">
          <Ladehinweis text="Fächer werden geladen …" />
        </div>
      ) : null}
      {abfrageZustand === 'fehler' ? (
        <div className="mt-4">
          <AbfrageFehler
            onWiederholen={() => faecherAbfrage.refetch()}
            text="Die Fächer konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {abfrageZustand === 'erfolg' && faecher !== undefined ? (
        <FachListe
          archivierung={archivieren}
          faecher={faecher}
          onArchivieren={(id) => {
            archivieren.reset();
            archivieren.mutate(id);
          }}
          onBearbeiten={(fach, ausloeser) => {
            fokus.merkeAusloeser(ausloeser);
            anlegen.reset();
            aendern.reset();
            setBearbeitung(fach);
          }}
        />
      ) : null}
      {abfrageZustand === 'leer' && bearbeitung === null ? (
        <div className="mt-4 border border-border bg-surface-sunken p-6">
          <p className="text-ink-muted">
            Noch keine Fächer. Lege dein erstes Fach an — mit der Gewichtung,
            die die Lehrkraft verkündet hat.
          </p>
        </div>
      ) : null}
    </section>
  );
};
