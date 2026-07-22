import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  eingabeKlasse,
  labelKlasse,
  leiseKnopfKlasse,
  primaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import type { FachFelder } from '../schemas/fach-schema.ts';
import {
  archiveFachFn,
  createFachFn,
  faecherQueryOptions,
  updateFachFn,
} from '../server/fach-fns.ts';
import type { Fach } from '../services/fach-service.ts';
import { FachForm } from './fach-form.tsx';

const gewichtszeile = (fach: Fach): string =>
  `Klausur ${fach.klausurWeight} · Test ${fach.testWeight} · Mündlich ${fach.muendlichWeight} · GFS ${fach.gfsWeight} · Sonstige ${fach.sonstigeWeight}`;

export const FaecherVerwaltung = ({
  schoolYears,
}: {
  readonly schoolYears: ReadonlyArray<string>;
}) => {
  const queryClient = useQueryClient();
  const [schoolYear, setSchoolYear] = useState(schoolYears[0] ?? '');
  const { data: faecher } = useQuery({
    ...faecherQueryOptions(schoolYear),
    enabled: schoolYear !== '',
  });
  const [bearbeitung, setBearbeitung] = useState<Fach | 'neu' | null>(null);

  const abschluss = {
    onSuccess: () => {
      setBearbeitung(null);
      return queryClient.invalidateQueries({
        queryKey: ['faecher', schoolYear],
      });
    },
  };
  const anlegen = useMutation({
    mutationFn: (werte: FachFelder) =>
      createFachFn({ data: { ...werte, schoolYear } }),
    ...abschluss,
  });
  const aendern = useMutation({
    mutationFn: (werte: FachFelder & { readonly id: string }) =>
      updateFachFn({ data: { ...werte, schoolYear } }),
    ...abschluss,
  });
  const archivieren = useMutation({
    mutationFn: (id: string) => archiveFachFn({ data: { id, schoolYear } }),
    ...abschluss,
  });

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
            onClick={() => setBearbeitung('neu')}
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
            fach={bearbeitung === 'neu' ? null : bearbeitung}
            onAbbrechen={() => setBearbeitung(null)}
            onSpeichern={(werte) => {
              if (bearbeitung === 'neu') {
                anlegen.mutate(werte);
              } else {
                aendern.mutate({ ...werte, id: bearbeitung.id });
              }
            }}
            titel={bearbeitung === 'neu' ? 'Neues Fach' : 'Fach bearbeiten'}
          />
        </div>
      )}
      <ul className="mt-4 space-y-3">
        {(faecher ?? []).map((fach) => (
          <li
            className="border border-border bg-surface p-4 shadow-card"
            key={fach.id}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-ink text-xl tracking-tight">
                {fach.name}
              </h3>
              <span className="text-ink-faint text-xs uppercase tracking-widest">
                {fach.shortName}
              </span>
            </div>
            <p className="mt-1 text-ink-muted text-sm">
              {gewichtszeile(fach)}
              {fach.writtenShare === null
                ? ' · gemeinsame Liste'
                : ` · schriftlich ${fach.writtenShare} %`}
            </p>
            <div className="mt-2 flex gap-3">
              <button
                className={leiseKnopfKlasse}
                onClick={() => setBearbeitung(fach)}
                type="button"
              >
                Bearbeiten
              </button>
              <button
                className={leiseKnopfKlasse}
                onClick={() => archivieren.mutate(fach.id)}
                type="button"
              >
                Archivieren
              </button>
            </div>
          </li>
        ))}
      </ul>
      {faecher !== undefined && faecher.length === 0 && bearbeitung === null ? (
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
