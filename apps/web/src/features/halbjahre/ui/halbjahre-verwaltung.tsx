import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  leiseKnopfKlasse,
  primaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import type { HalbjahrEingabe } from '../schemas/halbjahr-schema.ts';
import {
  createHalbjahrFn,
  halbjahreQueryOptions,
  updateHalbjahrFn,
} from '../server/halbjahr-fns.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';
import { HalbjahrForm } from './halbjahr-form.tsx';

const systemText = (halbjahr: Halbjahr) =>
  halbjahr.system === 'punkte' ? 'Notenpunkte 0–15' : 'Noten 1–6';

export const HalbjahreVerwaltung = () => {
  const queryClient = useQueryClient();
  const { data: halbjahre } = useQuery(halbjahreQueryOptions);
  const [bearbeitung, setBearbeitung] = useState<Halbjahr | 'neu' | null>(null);

  const abschluss = {
    onSuccess: () => {
      setBearbeitung(null);
      return queryClient.invalidateQueries({ queryKey: ['halbjahre'] });
    },
  };
  const anlegen = useMutation({
    mutationFn: (werte: HalbjahrEingabe) => createHalbjahrFn({ data: werte }),
    ...abschluss,
  });
  const aendern = useMutation({
    mutationFn: (werte: HalbjahrEingabe & { readonly id: string }) =>
      updateHalbjahrFn({ data: werte }),
    ...abschluss,
  });

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl text-ink tracking-tight">
          Halbjahre
        </h2>
        {bearbeitung === null ? (
          <button
            className={primaerKnopfKlasse}
            onClick={() => setBearbeitung('neu')}
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
            halbjahr={bearbeitung === 'neu' ? null : bearbeitung}
            onAbbrechen={() => setBearbeitung(null)}
            onSpeichern={(werte) => {
              if (bearbeitung === 'neu') {
                anlegen.mutate(werte);
              } else {
                aendern.mutate({ ...werte, id: bearbeitung.id });
              }
            }}
            titel={
              bearbeitung === 'neu' ? 'Neues Halbjahr' : 'Halbjahr bearbeiten'
            }
          />
        </div>
      )}
      <ul className="mt-4 space-y-3">
        {(halbjahre ?? []).map((halbjahr) => (
          <li
            className="border border-border bg-surface p-4 shadow-card"
            key={halbjahr.id}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-ink text-xl tracking-tight">
                {halbjahr.label}
              </h3>
              <span className="text-ink-faint text-xs uppercase tracking-widest">
                {halbjahr.schoolYear}
              </span>
            </div>
            <p className="mt-1 text-ink-muted text-sm">
              {halbjahr.startsOn} bis {halbjahr.endsOn} · {systemText(halbjahr)}
            </p>
            <div className="mt-2">
              <button
                className={leiseKnopfKlasse}
                onClick={() => setBearbeitung(halbjahr)}
                type="button"
              >
                Bearbeiten
              </button>
            </div>
          </li>
        ))}
      </ul>
      {halbjahre !== undefined &&
      halbjahre.length === 0 &&
      bearbeitung === null ? (
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
