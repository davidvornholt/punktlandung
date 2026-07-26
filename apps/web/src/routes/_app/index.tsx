import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';

import { LearnedToday } from '#/features/learning/ui/learned-today.tsx';
import { trendQueryOptions } from '#/features/noten/server/noten-fns.ts';
import { TrendChart } from '#/features/noten/ui/trend-chart.tsx';
import { toSechser } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { StatCard } from '#/shared/ui/stat-card.tsx';

const Overview = () => {
  const trendQuery = useQuery(trendQueryOptions);
  if (trendQuery.isPending) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Übersicht
        </h1>
        <div className="mt-6">
          <LoadingHint text="Übersicht wird geladen …" />
        </div>
      </>
    );
  }
  if (trendQuery.isError) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Übersicht
        </h1>
        <div className="mt-6">
          <QueryError
            onRetry={() => trendQuery.refetch()}
            text="Die Übersicht konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      </>
    );
  }
  const trend = trendQuery.data;
  const last = trend.at(-1);

  return (
    <>
      <h1 className="font-display text-3xl text-ink tracking-tight">
        Übersicht
      </h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          detail={
            last === undefined
              ? undefined
              : `entspricht Note ${formatNote(toSechser(last.average), 'sechser')}`
          }
          label="Gesamtschnitt"
          value={last === undefined ? '—' : formatNote(last.average, 'punkte')}
        />
        <StatCard label="Anzahl Noten" value={`${trend.length}`} />
        <LearnedToday />
      </div>
      <section className="mt-8">
        <h2 className="font-display text-2xl text-ink tracking-tight">
          Verlaufslinie
        </h2>
        {trend.length > 0 ? (
          <div className="mt-4 border border-border bg-surface p-4 shadow-card">
            <TrendChart entries={trend} />
          </div>
        ) : (
          <div className="mt-4 border border-border bg-surface-sunken p-8">
            <p className="text-ink">Noch keine Noten — noch keine Linie.</p>
            <p className="mt-2 text-ink-muted">
              Lege unter{' '}
              <Link className="underline underline-offset-4" to="/faecher">
                Fächer
              </Link>{' '}
              deine Fächer an, dann trage unter{' '}
              <Link className="underline underline-offset-4" to="/noten">
                Noten
              </Link>{' '}
              die erste Note ein. Ab der ersten Note zeichnet die Verlaufslinie
              deinen gewichteten Gesamtschnitt über alle Halbjahre.
            </p>
          </div>
        )}
      </section>
    </>
  );
};

export const Route = createFileRoute('/_app/')({
  component: Overview,
  head: () => ({ meta: [{ title: pageTitle('Übersicht') }] }),
});
