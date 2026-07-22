import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { berlinKalenderdatum } from '#/shared/datum/kalenderdatum.ts';
import { AbfrageFehler, Ladehinweis } from '#/shared/ui/abfrage-zustand.tsx';
import { aktionsfehlerText } from '#/shared/ui/aktionsfehler.ts';
import {
  eingabeKlasse,
  labelKlasse,
  primaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import { lernGrenzen } from '../schemas/lerntag-schema.ts';
import {
  lernStatistikQueryOptions,
  logLerntagFn,
} from '../server/lernen-fns.ts';

/** Kompakte Lernen-Kachel: „Heute gelernt" plus kleine Statistikleiste. */
export const HeuteGelernt = () => {
  const queryClient = useQueryClient();
  const statistikAbfrage = useQuery(lernStatistikQueryOptions);
  const eintragen = useMutation({
    mutationFn: (minutes: number | null) =>
      logLerntagFn({
        data: {
          day: berlinKalenderdatum(),
          subjectId: null,
          minutes,
          notiz: null,
        },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['lern-statistik'] }),
  });

  return (
    <section className="border border-border bg-surface p-4 shadow-card">
      <h2 className="text-ink-faint text-xs uppercase tracking-widest">
        Lerntage
      </h2>
      {statistikAbfrage.isPending ? (
        <div className="mt-2">
          <Ladehinweis text="Lerntage werden geladen …" />
        </div>
      ) : null}
      {statistikAbfrage.isError ? (
        <div className="mt-3">
          <AbfrageFehler
            onWiederholen={() => statistikAbfrage.refetch()}
            text="Die Lernstatistik konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {statistikAbfrage.data === undefined ? null : (
        <dl className="mt-2 flex gap-6">
          <div>
            <dt className="text-ink-muted text-sm">Diesen Monat</dt>
            <dd className="font-display text-3xl text-ink tracking-tight">
              {statistikAbfrage.data.tageDiesenMonat}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted text-sm">Serie</dt>
            <dd className="font-display text-3xl text-ink tracking-tight">
              {statistikAbfrage.data.serie} Tage
            </dd>
          </div>
        </dl>
      )}
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(ereignis) => {
          ereignis.preventDefault();
          const roh =
            `${new FormData(ereignis.currentTarget).get('minuten') ?? ''}`.trim();
          eintragen.reset();
          eintragen.mutate(roh === '' ? null : Number(roh));
        }}
      >
        <label className={labelKlasse}>
          Minuten (optional)
          <input
            className={`${eingabeKlasse} w-28`}
            inputMode="numeric"
            max={lernGrenzen.minutenMax}
            min={1}
            name="minuten"
            step={1}
            type="number"
          />
        </label>
        <button
          className={primaerKnopfKlasse}
          disabled={eintragen.isPending}
          type="submit"
        >
          {eintragen.isPending ? 'Wird eingetragen …' : 'Heute gelernt'}
        </button>
      </form>
      {eintragen.isSuccess ? (
        <p className="mt-2 text-ink-muted text-sm" role="status">
          Eingetragen — der heutige Lerntag zählt.
        </p>
      ) : null}
      {eintragen.isError ? (
        <p
          className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
          role="alert"
        >
          {aktionsfehlerText(
            eintragen.error,
            'Der Lerntag konnte nicht eingetragen werden. Die Minuten bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
          )}
        </p>
      ) : null}
    </section>
  );
};
