import { useMutation, useQueryClient } from '@tanstack/react-query';

import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import type { StudyRecency } from '#/shared/lernen/study-recency.ts';
import { studyRecencyText } from '#/shared/lernen/study-recency.ts';
import { invalidateAll } from '#/shared/query/query-invalidation.ts';
import {
  learningStatisticsKey,
  leistungKey,
  upcomingKey,
} from '#/shared/query/query-keys.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import type { StudyDayInput } from '../schemas/study-day-schema.ts';

/**
 * Der Lerntag einer Leistung: ein Knopf, der den heutigen Tag dieser
 * Klausur widmet, und der Stand daneben. Bewusst ohne Minuten und ohne
 * Serie — der Tag zählt, nicht die Kette.
 */
export const LearnedForLeistung = ({
  fachId,
  leistungId,
  lernen,
  log,
}: {
  readonly fachId: string;
  readonly leistungId: string;
  readonly lernen: StudyRecency;
  readonly log: (input: StudyDayInput) => Promise<unknown>;
}) => {
  const queryClient = useQueryClient();
  const logMutation = useMutation({
    mutationFn: () =>
      log({
        day: berlinCalendarDate(),
        subjectId: fachId,
        gradeId: leistungId,
        minutes: null,
        notiz: null,
      }),
    onSuccess: () =>
      invalidateAll(queryClient, [
        leistungKey(leistungId),
        upcomingKey,
        learningStatisticsKey,
      ]),
  });
  const today = lernen.daysAgo === 0;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border border-border bg-surface px-4 py-3 shadow-card">
      <p className="text-ink-muted text-sm">{studyRecencyText(lernen)}</p>
      <button
        className={`${primaryButtonClass} ml-auto disabled:opacity-50`}
        disabled={logMutation.isPending || today}
        onClick={() => {
          logMutation.reset();
          logMutation.mutate();
        }}
        type="button"
      >
        {logMutation.isPending ? 'Wird eingetragen …' : 'Heute dafür gelernt'}
      </button>
      {logMutation.isError ? (
        <p
          className="basis-full border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
          role="alert"
        >
          {actionErrorText(
            logMutation.error,
            'Der Lerntag konnte nicht eingetragen werden. Prüfe die Verbindung und versuche es erneut.',
          )}
        </p>
      ) : null}
    </div>
  );
};
