import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { type ReactNode, useRef } from 'react';

import { faecherQueryOptions } from '#/features/faecher/server/fach-fns.ts';
import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { defaultHalbjahr } from '#/features/halbjahre/services/current-halbjahr.ts';
import { HalbjahrSelect } from '#/features/halbjahre/ui/halbjahr-select.tsx';
import { LeistungLink } from '#/features/noten/ui/noten-links.tsx';
import type { SearchChange } from '#/features/noten/ui/noten-list-model.ts';
import { liveNotenOperations } from '#/features/noten/ui/noten-operations.ts';
import { NotenSection } from '#/features/noten/ui/noten-section.tsx';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { nbsp } from '#/shared/date/date-text.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import { EmptyState } from '#/shared/ui/empty-state.tsx';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import { PageHeader } from '#/shared/ui/page-header.tsx';
import { parseNotenSearch } from '#/shared/ui/page-search.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';

/** The Notensystem in the head of the page; the bars below show its range. */
const systemWord: Readonly<Record<Notensystem, string>> = {
  punkte: 'Notenpunkte',
  sechser: `Noten${nbsp}von${nbsp}1${nbsp}bis${nbsp}6`,
};

const NotenPage = () => {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const halbjahreQuery = useQuery(halbjahreQueryOptions);
  const halbjahre = halbjahreQuery.data;
  const today = berlinCalendarDate();
  const defaultValue =
    halbjahre === undefined ? null : defaultHalbjahr(halbjahre, today);
  const halbjahr =
    halbjahre?.find((entry) => entry.id === search.halbjahr) ?? defaultValue;
  const faecherQuery = useQuery({
    ...faecherQueryOptions(halbjahr?.schoolYear ?? ''),
    enabled: halbjahr !== null,
  });
  const faecher = faecherQuery.data;
  // The head of the page takes the focus when a retry removes the button that had it.
  const headRef = useRef<HTMLHeadingElement>(null);
  const head = (lead?: string, picker?: ReactNode) => (
    <PageHeader headingRef={headRef} lead={lead} title="Noten">
      {picker}
    </PageHeader>
  );

  if (
    halbjahreQuery.isPending ||
    (halbjahr !== null && faecherQuery.isPending)
  ) {
    return (
      <>
        {head()}
        <LoadingHint text="Noten werden geladen …" />
      </>
    );
  }
  const retry = retryWithFocus(
    () =>
      Promise.all([
        halbjahreQuery.isError ? halbjahreQuery.refetch() : null,
        faecherQuery.isError ? faecherQuery.refetch() : null,
      ]).then((results) => ({
        isSuccess: results.every((result) => result?.isSuccess ?? true),
      })),
    headRef,
  );
  // A failed refresh keeps the page already shown, so an open entry stays
  // mounted with what was typed.
  if (halbjahre === undefined || (halbjahr !== null && faecher === undefined)) {
    return (
      <>
        {head()}
        <QueryError
          onRetry={retry}
          text="Halbjahre oder Fächer konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
        />
      </>
    );
  }
  const refreshError =
    halbjahreQuery.isError || faecherQuery.isError ? (
      <div className="mb-6">
        <QueryError
          onRetry={retry}
          text="Halbjahre oder Fächer konnten nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut."
        />
      </div>
    ) : null;

  if (halbjahr === null) {
    return (
      <>
        {head()}
        {refreshError}
        <EmptyState
          text="Eine Note gehört zu einem Halbjahr. Lege in den Einstellungen das laufende an, dann haben Noten ein Zuhause."
          title="Noch kein Halbjahr"
        >
          <Link className={primaryButtonClass} to="/einstellungen">
            Halbjahr anlegen
          </Link>
        </EmptyState>
      </>
    );
  }

  // The Halbjahr stays in the address while what is open on the page changes.
  const shown =
    halbjahr.id === defaultValue?.id ? {} : { halbjahr: halbjahr.id };
  const onSearch: SearchChange = (next, { replace }) =>
    navigate({ search: { ...shown, ...next }, replace, resetScroll: false });
  return (
    <>
      {head(
        // Each part stays in one piece, so a narrow head breaks between them.
        [
          `Halbjahr${nbsp}${formatHalbjahrLabel(halbjahr)}`,
          `Schuljahr${nbsp}${halbjahr.schoolYear}`,
          systemWord[halbjahr.system],
        ].join(' · '),
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
      {/* Der Halbjahrwechsel setzt die Liste und was auf ihr offen ist neu auf. */}
      <NotenSection
        faecher={faecher ?? []}
        halbjahr={halbjahr}
        key={halbjahr.id}
        link={LeistungLink}
        onSearch={onSearch}
        operations={liveNotenOperations}
        search={search}
        today={today}
      />
    </>
  );
};

export const Route = createFileRoute('/_app/noten')({
  component: NotenPage,
  head: () => ({ meta: [{ title: pageTitle('Noten') }] }),
  validateSearch: parseNotenSearch,
});
