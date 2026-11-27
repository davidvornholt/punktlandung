import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useRef } from 'react';

import { listFaecherFn } from '#/features/faecher/server/fach-fns.ts';
import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { defaultHalbjahr } from '#/features/halbjahre/services/current-halbjahr.ts';
import {
  listNotenFn,
  trendQueryOptions,
  upcomingFn,
} from '#/features/noten/server/noten-fns.ts';
import { AnstehendRail } from '#/features/noten/ui/anstehend-rail.tsx';
import { OverviewFaecher } from '#/features/noten/ui/overview-faecher.tsx';
import { OverviewHero } from '#/features/noten/ui/overview-hero.tsx';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { formatLongDate, nbsp } from '#/shared/date/date-text.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import { EmptyState } from '#/shared/ui/empty-state.tsx';
import { linkClass, primaryButtonClass } from '#/shared/ui/form-classes.ts';
import { PageHeader } from '#/shared/ui/page-header.tsx';
import { pageTitle } from '#/shared/ui/page-title.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';

const loadUpcoming = () => upcomingFn();

const Overview = () => {
  const trendQuery = useQuery(trendQueryOptions);
  const halbjahreQuery = useQuery(halbjahreQueryOptions);
  const today = berlinCalendarDate();
  const trend = trendQuery.data;
  const halbjahre = halbjahreQuery.data;
  const halbjahr =
    halbjahre === undefined ? null : defaultHalbjahr(halbjahre, today);
  const heroHalbjahre = useMemo(
    () =>
      (halbjahre ?? []).map((entry) => ({
        id: entry.id,
        label: formatHalbjahrLabel(entry),
        startsOn: entry.startsOn,
      })),
    [halbjahre],
  );
  // The head of the page takes the focus when a retry removes the button that had it.
  const headRef = useRef<HTMLHeadingElement>(null);
  // While the Halbjahr is not known yet, the line keeps its height: nothing jumps when it arrives.
  const head = (lead: string = nbsp) => (
    <PageHeader headingRef={headRef} lead={lead} title="Übersicht">
      <p className="-mt-2.5 desk:mt-0 text-ink-soft text-sm">
        {formatLongDate(today)}
      </p>
    </PageHeader>
  );

  if (trendQuery.isPending || halbjahreQuery.isPending) {
    return (
      <>
        {head()}
        <LoadingHint text="Übersicht wird geladen …" />
      </>
    );
  }
  const retry = retryWithFocus(
    () =>
      Promise.all([
        trendQuery.isError ? trendQuery.refetch() : trendQuery,
        halbjahreQuery.isError ? halbjahreQuery.refetch() : halbjahreQuery,
      ]).then((results) => ({
        isSuccess: results.every((result) => result.isSuccess),
      })),
    headRef,
  );
  // When only a reload fails, the Übersicht loaded last stays.
  if (trend === undefined || halbjahre === undefined) {
    return (
      <>
        {head()}
        <QueryError
          onRetry={retry}
          text="Die Übersicht konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
        />
      </>
    );
  }
  const refreshError =
    trendQuery.isError || halbjahreQuery.isError ? (
      <div className="mb-6">
        <QueryError
          onRetry={retry}
          text="Die Übersicht konnte nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut."
        />
      </div>
    ) : null;

  if (halbjahr === null) {
    return (
      <>
        {head('Noch kein Halbjahr')}
        {refreshError}
        <EmptyState
          text="Jede Note gehört zu einem Halbjahr. Lege in den Einstellungen das laufende an, dann deine Fächer, und trage die erste Note ein: Ab dann zeigt die Übersicht, wo deine Noten im Gleichgewicht sind."
          title="Noch kein Halbjahr, noch keine Übersicht"
        >
          <Link className={primaryButtonClass} to="/einstellungen">
            Halbjahr anlegen
          </Link>
        </EmptyState>
      </>
    );
  }

  const label = formatHalbjahrLabel(halbjahr);
  return (
    <>
      {head(`Halbjahr ${label} · Schuljahr ${halbjahr.schoolYear}`)}
      {refreshError}
      {trend.length === 0 ? (
        <EmptyState
          text={
            <>
              Lege unter{' '}
              <Link className={`${linkClass} text-ink`} to="/faecher">
                Fächer
              </Link>{' '}
              deine Fächer an, dann trage unter{' '}
              <Link className={`${linkClass} text-ink`} to="/noten">
                Noten
              </Link>{' '}
              die erste Note ein. Jede Note landet als Punkt auf der Skala, und
              die Übersicht zeigt, wo alle zusammen im Gleichgewicht sind: dein
              gewichteter Gesamtschnitt über alle Halbjahre.
            </>
          }
          title="Die Skala ist noch leer"
        >
          <Link
            className={primaryButtonClass}
            search={{ neu: true }}
            to="/noten"
          >
            Erste Note eintragen
          </Link>
        </EmptyState>
      ) : (
        <OverviewHero
          currentHalbjahrId={halbjahr.id}
          entries={trend}
          halbjahre={heroHalbjahre}
          today={today}
        />
      )}
      {/*
        The two blocks stand side by side where both have the room they need
        and one under the other where they do not. The widths they ask for
        decide that, not the width of the window: a window just past the
        breakpoint is too narrow for two columns.
      */}
      <div className="desk:mt-15 mt-10 flex flex-wrap gap-x-18 gap-y-11">
        <div className="min-w-0 max-w-[40rem] flex-[5_1_26rem]">
          <AnstehendRail load={loadUpcoming} today={today} />
        </div>
        <div className="min-w-0 flex-[7_1_34rem]">
          <OverviewFaecher
            halbjahr={{
              id: halbjahr.id,
              label,
              schoolYear: halbjahr.schoolYear,
              system: halbjahr.system,
            }}
            loadFaecher={() =>
              listFaecherFn({ data: { schoolYear: halbjahr.schoolYear } })
            }
            loadNoten={() => listNotenFn({ data: { termId: halbjahr.id } })}
            today={today}
          />
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute('/_app/')({
  component: Overview,
  head: () => ({ meta: [{ title: pageTitle('Übersicht') }] }),
});
