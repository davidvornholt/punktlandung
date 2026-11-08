import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useRef, useState } from 'react';

import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { defaultHalbjahr } from '#/features/halbjahre/services/current-halbjahr.ts';
import { HalbjahrSelect } from '#/features/halbjahre/ui/halbjahr-select.tsx';
import { Zeugnisblatt } from '#/features/zeugnis/ui/zeugnisblatt.tsx';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';

const ZeugnisPage = () => {
  const halbjahreQuery = useQuery(halbjahreQueryOptions);
  const halbjahre = halbjahreQuery.data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  if (halbjahreQuery.isPending) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Zeugnis
        </h1>
        <div className="mt-6">
          <LoadingHint text="Zeugnis wird geladen …" />
        </div>
      </>
    );
  }
  const retry = retryWithFocus(() => halbjahreQuery.refetch(), headingRef);
  // Scheitert nur ein Neuladen, bleibt das zuletzt geladene Zeugnis stehen.
  if (halbjahre === undefined) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Zeugnis
        </h1>
        <div className="mt-6">
          <QueryError
            onRetry={retry}
            text="Die Halbjahre für das Zeugnis konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      </>
    );
  }

  const defaultValue = defaultHalbjahr(halbjahre, berlinCalendarDate());
  const halbjahr =
    halbjahre.find((entry) => entry.id === selectedId) ?? defaultValue;

  return (
    <>
      <h1
        className="font-display text-3xl text-ink tracking-tight"
        ref={headingRef}
        tabIndex={-1}
      >
        Zeugnis
      </h1>
      {halbjahreQuery.isError ? (
        <div className="mt-6">
          <QueryError
            onRetry={retry}
            text="Die Halbjahre für das Zeugnis konnten nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {halbjahr === null ? (
        <div className="mt-6 border border-border bg-surface-sunken p-8">
          <p className="text-ink">Noch kein Halbjahr, noch kein Zeugnis.</p>
          <p className="mt-2 text-ink-muted">
            Lege unter{' '}
            <Link className="underline underline-offset-4" to="/einstellungen">
              Einstellungen
            </Link>{' '}
            ein Halbjahr an — danach entsteht hier die Zeugnisvorschau.
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
          <Zeugnisblatt halbjahrId={halbjahr.id} />
        </>
      )}
    </>
  );
};

export const Route = createFileRoute('/_app/zeugnis')({
  component: ZeugnisPage,
  head: () => ({ meta: [{ title: pageTitle('Zeugnis') }] }),
});
