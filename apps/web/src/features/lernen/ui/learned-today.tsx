import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import {
  inputClass,
  labelClass,
  primaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { learningLimits } from '../schemas/study-day-schema.ts';
import {
  learningStatisticsQueryOptions,
  logLerntagFn,
} from '../server/lernen-fns.ts';

/** Kompakte Lernen-Kachel: „Heute gelernt" plus kleine Statistikleiste. */
export const LearnedToday = () => {
  const queryClient = useQueryClient();
  const statisticsQuery = useQuery(learningStatisticsQueryOptions);
  const createMutation = useMutation({
    mutationFn: (minutes: number | null) =>
      logLerntagFn({
        data: {
          day: berlinCalendarDate(),
          subjectId: null,
          minutes,
          notiz: null,
        },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['learning-statistics'] }),
  });

  return (
    <section className="border border-border bg-surface p-4 shadow-card">
      <h2 className="text-ink-faint text-xs uppercase tracking-widest">
        Lerntage
      </h2>
      {statisticsQuery.isPending ? (
        <div className="mt-2">
          <LoadingHint text="Lerntage werden geladen …" />
        </div>
      ) : null}
      {statisticsQuery.isError ? (
        <div className="mt-3">
          <QueryError
            onRetry={() => statisticsQuery.refetch()}
            text="Die Lernstatistik konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {statisticsQuery.data === undefined ? null : (
        <dl className="mt-2 flex gap-6">
          <div>
            <dt className="text-ink-muted text-sm">Diesen Monat</dt>
            <dd className="font-display text-3xl text-ink tracking-tight">
              {statisticsQuery.data.tageDiesenMonat}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted text-sm">Serie</dt>
            <dd className="font-display text-3xl text-ink tracking-tight">
              {statisticsQuery.data.serie} Tage
            </dd>
          </div>
        </dl>
      )}
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const raw =
            `${new FormData(event.currentTarget).get('minutes') ?? ''}`.trim();
          createMutation.reset();
          createMutation.mutate(raw === '' ? null : Number(raw));
        }}
      >
        <label className={labelClass}>
          Minuten (optional)
          <input
            className={`${inputClass} w-28`}
            inputMode="numeric"
            max={learningLimits.maxMinutes}
            min={1}
            name="minutes"
            step={1}
            type="number"
          />
        </label>
        <button
          className={primaryButtonClass}
          disabled={createMutation.isPending}
          type="submit"
        >
          {createMutation.isPending ? 'Wird eingetragen …' : 'Heute gelernt'}
        </button>
      </form>
      {createMutation.isSuccess ? (
        <p className="mt-2 text-ink-muted text-sm" role="status">
          Eingetragen — der heutige Lerntag zählt.
        </p>
      ) : null}
      {createMutation.isError ? (
        <p
          className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
          role="alert"
        >
          {actionErrorText(
            createMutation.error,
            'Der Lerntag konnte nicht eingetragen werden. Die Minuten bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
          )}
        </p>
      ) : null}
    </section>
  );
};
