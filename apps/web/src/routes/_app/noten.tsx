import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { faecherQueryOptions } from '#/features/faecher/server/fach-fns.ts';
import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { defaultHalbjahr } from '#/features/halbjahre/services/current-halbjahr.ts';
import { HalbjahrSelect } from '#/features/halbjahre/ui/halbjahr-select.tsx';
import { liveNotenOperations } from '#/features/noten/ui/noten-operations.ts';
import { NotenSection } from '#/features/noten/ui/noten-section.tsx';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';

const NotenPage = () => {
  const halbjahreQuery = useQuery(halbjahreQueryOptions);
  const halbjahre = halbjahreQuery.data;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const defaultValue =
    halbjahre === undefined
      ? null
      : defaultHalbjahr(halbjahre, berlinCalendarDate());
  const halbjahr =
    halbjahre?.find((entry) => entry.id === selectedId) ?? defaultValue;
  const faecherQuery = useQuery({
    ...faecherQueryOptions(halbjahr?.schoolYear ?? ''),
    enabled: halbjahr !== null,
  });
  const faecher = faecherQuery.data;

  if (
    halbjahreQuery.isPending ||
    (halbjahr !== null && faecherQuery.isPending)
  ) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">Noten</h1>
        <div className="mt-6">
          <LoadingHint text="Noten werden geladen …" />
        </div>
      </>
    );
  }
  const retry = () =>
    Promise.all([
      halbjahreQuery.isError ? halbjahreQuery.refetch() : Promise.resolve(),
      faecherQuery.isError ? faecherQuery.refetch() : Promise.resolve(),
    ]);
  // A failed refresh keeps the page already shown, so the note entry bar and
  // an open edit in the list stay mounted with their unsaved input.
  if (halbjahre === undefined || (halbjahr !== null && faecher === undefined)) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">Noten</h1>
        <div className="mt-6">
          <QueryError
            onRetry={retry}
            text="Halbjahre oder Fächer konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl text-ink tracking-tight">Noten</h1>
      {halbjahreQuery.isError || faecherQuery.isError ? (
        <div className="mt-6">
          <QueryError
            onRetry={retry}
            text="Halbjahre oder Fächer konnten nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {halbjahr === null ? (
        <div className="mt-6 border border-border bg-surface-sunken p-8">
          <p className="text-ink">Es gibt noch kein Halbjahr.</p>
          <p className="mt-2 text-ink-muted">
            Lege unter{' '}
            <Link className="underline underline-offset-4" to="/einstellungen">
              Einstellungen
            </Link>{' '}
            das laufende Halbjahr an, damit Noten ein Zuhause haben.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 max-w-xs">
            <HalbjahrSelect
              halbjahre={halbjahre}
              onChange={setSelectedId}
              value={halbjahr.id}
            />
          </div>
          {/* Der Halbjahrwechsel setzt Eintragsleiste und Liste neu auf. */}
          <NotenSection
            faecher={faecher ?? []}
            halbjahr={halbjahr}
            key={halbjahr.id}
            operations={liveNotenOperations}
          />
        </>
      )}
    </>
  );
};

export const Route = createFileRoute('/_app/noten')({
  component: NotenPage,
  head: () => ({ meta: [{ title: pageTitle('Noten') }] }),
});
