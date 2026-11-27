import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { type ReactNode, useRef } from 'react';

import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { defaultHalbjahr } from '#/features/halbjahre/services/current-halbjahr.ts';
import { HalbjahrSelect } from '#/features/halbjahre/ui/halbjahr-select.tsx';
import { zeugnisFn } from '#/features/zeugnis/server/zeugnis-fns.ts';
import { Zeugnisblatt } from '#/features/zeugnis/ui/zeugnisblatt.tsx';
import {
  berlinCalendarDate,
  formatIsoDate,
} from '#/shared/date/calendar-date.ts';
import { nbsp } from '#/shared/date/date-text.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import { EmptyState } from '#/shared/ui/empty-state.tsx';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import { PageHeader } from '#/shared/ui/page-header.tsx';
import { parseHalbjahrSearch } from '#/shared/ui/page-search.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';

const loadZeugnis = (termId: string) => zeugnisFn({ data: { termId } });

const ZeugnisPage = () => {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const halbjahreQuery = useQuery(halbjahreQueryOptions);
  const halbjahre = halbjahreQuery.data;
  // The head of the page takes the focus when a retry removes the button that had it.
  const headRef = useRef<HTMLHeadingElement>(null);
  const head = (lead?: string, picker?: ReactNode) => (
    <PageHeader headingRef={headRef} lead={lead} title="Zeugnis">
      {picker}
    </PageHeader>
  );

  if (halbjahreQuery.isPending) {
    return (
      <>
        {head()}
        <LoadingHint text="Zeugnis wird geladen …" />
      </>
    );
  }
  const retry = retryWithFocus(() => halbjahreQuery.refetch(), headRef);
  // When only a reload fails, the Zeugnis loaded last stays.
  if (halbjahre === undefined) {
    return (
      <>
        {head()}
        <QueryError
          onRetry={retry}
          text="Die Halbjahre für das Zeugnis konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
        />
      </>
    );
  }

  const today = berlinCalendarDate();
  const defaultValue = defaultHalbjahr(halbjahre, today);
  const halbjahr =
    halbjahre.find((entry) => entry.id === search.halbjahr) ?? defaultValue;
  const refreshError = halbjahreQuery.isError ? (
    <div className="mb-6">
      <QueryError
        onRetry={retry}
        text="Die Halbjahre für das Zeugnis konnten nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut."
      />
    </div>
  ) : null;

  if (halbjahr === null) {
    return (
      <>
        {head()}
        {refreshError}
        <EmptyState
          text="Ein Zeugnis gehört zu einem Halbjahr. Lege in den Einstellungen eines an, dann landen hier die Halbjahresnoten."
          title="Noch kein Halbjahr, noch kein Zeugnis"
        >
          <Link className={primaryButtonClass} to="/einstellungen">
            Halbjahr anlegen
          </Link>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      {head(
        // Each of the three parts stays whole, and a line never begins with the dot that divides them.
        `Vorschau für${nbsp}${formatHalbjahrLabel(halbjahr)}${nbsp}· Schuljahr${nbsp}${halbjahr.schoolYear}${nbsp}· Stand${nbsp}${formatIsoDate(today)}`,
        <HalbjahrSelect
          halbjahre={halbjahre}
          onChange={(id) =>
            navigate({
              // The address names a Halbjahr only when it is not the one shown anyway.
              search: id === defaultValue?.id ? {} : { halbjahr: id },
              replace: true,
            })
          }
          value={halbjahr.id}
        />,
      )}
      {refreshError}
      <Zeugnisblatt halbjahrId={halbjahr.id} load={loadZeugnis} today={today} />
    </>
  );
};

export const Route = createFileRoute('/_app/zeugnis')({
  component: ZeugnisPage,
  head: () => ({ meta: [{ title: pageTitle('Zeugnis') }] }),
  validateSearch: parseHalbjahrSearch,
});
