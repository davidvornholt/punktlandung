import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

const heutigesDatum = () =>
  new Date().toISOString().slice(0, '0000-00-00'.length);

/** Kompakte Lernen-Kachel: „Heute gelernt" plus kleine Statistikleiste. */
export const HeuteGelernt = () => {
  const queryClient = useQueryClient();
  const { data: statistik } = useQuery(lernStatistikQueryOptions);
  const eintragen = useMutation({
    mutationFn: (minutes: number | null) =>
      logLerntagFn({
        data: { day: heutigesDatum(), subjectId: null, minutes, notiz: null },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['lern-statistik'] }),
  });

  return (
    <section className="border border-border bg-surface p-4 shadow-card">
      <h2 className="text-ink-faint text-xs uppercase tracking-widest">
        Lerntage
      </h2>
      <dl className="mt-2 flex gap-6">
        <div>
          <dt className="text-ink-muted text-sm">Diesen Monat</dt>
          <dd className="font-display text-3xl text-ink tracking-tight">
            {statistik?.tageDiesenMonat ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted text-sm">Serie</dt>
          <dd className="font-display text-3xl text-ink tracking-tight">
            {statistik === undefined ? '—' : `${statistik.serie} Tage`}
          </dd>
        </div>
      </dl>
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(ereignis) => {
          ereignis.preventDefault();
          const roh =
            `${new FormData(ereignis.currentTarget).get('minuten') ?? ''}`.trim();
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
          Heute gelernt
        </button>
      </form>
      {eintragen.isSuccess ? (
        <p className="mt-2 text-ink-muted text-sm" role="status">
          Eingetragen — der heutige Lerntag zählt.
        </p>
      ) : null}
    </section>
  );
};
