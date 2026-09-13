import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useId } from 'react';

import { studyRecencyText } from '#/shared/lernen/study-recency.ts';
import { upcomingKey } from '#/shared/query/query-keys.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import type {
  Upcoming,
  UpcomingLeistung,
} from '../services/upcoming-calculation.ts';
import { topicsText } from './preparation-text.ts';
import {
  fachschnittText,
  overdueHeading,
  terminText,
  upcomingLabel,
} from './upcoming-text.ts';

/**
 * Eine bevorstehende Leistung. Der Fachname führt zur Leistung — dort liegt
 * die Themenliste, deren Stand hier steht.
 */
const UpcomingRow = ({ leistung }: { readonly leistung: UpcomingLeistung }) => (
  <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
    <Link
      aria-label={upcomingLabel(leistung)}
      className="font-display text-ink text-xl tracking-tight underline decoration-border-strong underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      params={{ id: leistung.id }}
      to="/noten/$id"
    >
      {leistung.fachName}
    </Link>
    <span className="text-ink-muted text-sm">{terminText(leistung)}</span>
    <span className="ml-auto flex flex-wrap gap-x-3 text-ink-faint text-sm">
      <span>{topicsText(leistung.topics)}</span>
      <span>{fachschnittText(leistung)}</span>
    </span>
    <span className="basis-full text-ink-faint text-sm">
      {studyRecencyText(leistung.lernen)}
    </span>
  </li>
);

/**
 * Überfällige Leistungen bekommen eine eigene Nachfrage: Termin vorbei, Note
 * fehlt. Solange sie fehlt, zählt die Leistung in keinem Schnitt — genau das
 * darf nicht unbemerkt bleiben.
 */
const OverdueRow = ({ leistung }: { readonly leistung: UpcomingLeistung }) => (
  <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
    <span className="text-ink">{leistung.fachName}</span>
    <span className="text-ink-muted text-sm">{terminText(leistung)}</span>
    <Link
      aria-label={`Note eintragen: ${upcomingLabel(leistung)}`}
      className="ml-auto text-ink text-sm underline underline-offset-4"
      params={{ id: leistung.id }}
      to="/noten/$id"
    >
      Note eintragen
    </Link>
  </li>
);

const UpcomingContent = ({ upcoming }: { readonly upcoming: Upcoming }) => {
  if (upcoming.upcoming.length === 0 && upcoming.overdue.length === 0) {
    return (
      <div className="mt-4 border border-border bg-surface-sunken p-6">
        <p className="text-ink">Nichts angekündigt.</p>
        <p className="mt-2 text-ink-muted">
          Sobald eine Klausur, ein Test oder eine GFS einen Termin hat, trage
          sie unter{' '}
          <Link className="underline underline-offset-4" to="/noten">
            Noten
          </Link>{' '}
          ohne Note ein. Sie erscheint dann hier, nach Gewicht, Nähe und offenen
          Themen geordnet.
        </p>
      </div>
    );
  }
  return (
    <>
      {upcoming.overdue.length > 0 ? (
        <section
          aria-label={overdueHeading(upcoming.overdue.length)}
          className="mt-4 border border-critical bg-critical-subtle px-4 py-3"
        >
          <h3 className="text-ink text-sm">
            {overdueHeading(upcoming.overdue.length)}
          </h3>
          <ul className="mt-1 divide-y divide-border">
            {upcoming.overdue.map((leistung) => (
              <OverdueRow key={leistung.id} leistung={leistung} />
            ))}
          </ul>
        </section>
      ) : null}
      {upcoming.upcoming.length > 0 ? (
        <ul className="mt-4 divide-y divide-border border border-border bg-surface px-4 shadow-card">
          {upcoming.upcoming.map((leistung) => (
            <UpcomingRow key={leistung.id} leistung={leistung} />
          ))}
        </ul>
      ) : null}
    </>
  );
};

/**
 * Der Anstehend-Block der Übersicht: was noch geschrieben wird, dringendste
 * zuerst, und was schon geschrieben ist, aber noch keine Note hat. Der
 * Serveraufruf kommt als `load` herein, damit der Block ohne die Laufzeit
 * der Serverfunktionen gerendert und geprüft werden kann.
 */
export const UpcomingBlock = ({
  load,
}: {
  readonly load: () => Promise<Upcoming>;
}) => {
  const upcomingQuery = useQuery({ queryKey: upcomingKey, queryFn: load });
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h2
        className="font-display text-2xl text-ink tracking-tight"
        id={headingId}
      >
        Anstehend
      </h2>
      {upcomingQuery.isPending ? (
        <div className="mt-4">
          <LoadingHint text="Anstehende Leistungen werden geladen …" />
        </div>
      ) : null}
      {upcomingQuery.isError ? (
        <div className="mt-4">
          <QueryError
            onRetry={() => upcomingQuery.refetch()}
            text="Die anstehenden Leistungen konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {upcomingQuery.data === undefined ? null : (
        <UpcomingContent upcoming={upcomingQuery.data} />
      )}
    </section>
  );
};
