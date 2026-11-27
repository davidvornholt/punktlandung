import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { halbjahreKey } from '#/shared/query/query-keys.ts';
import { EmptyState } from '#/shared/ui/empty-state.tsx';
import { PageHeader } from '#/shared/ui/page-header.tsx';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';
import type { FachOperations } from './fach-operations.ts';
import { FaecherManagement } from './faecher-management.tsx';
import { SchoolYearChoice } from './school-year-choice.tsx';

type SchuljahrMitNotensystem = {
  readonly schoolYear: string;
  readonly system: Notensystem;
};

export type FaecherPageOperations = FachOperations & {
  readonly listHalbjahre: () => Promise<ReadonlyArray<SchuljahrMitNotensystem>>;
};

const Schuljahre = ({
  halbjahre,
  noHalbjahrAction,
  operations,
  schoolYear,
}: {
  readonly halbjahre: ReadonlyArray<SchuljahrMitNotensystem>;
  readonly noHalbjahrAction: ReactNode;
  readonly operations: FachOperations;
  readonly schoolYear: string;
}) => {
  if (schoolYear === '') {
    return (
      <EmptyState
        text="Fächer gehören zu einem Schuljahr, und ein Schuljahr gibt es, sobald du eines seiner Halbjahre angelegt hast. Lege zuerst in den Einstellungen ein Halbjahr an."
        title="Noch kein Halbjahr"
      >
        {noHalbjahrAction}
      </EmptyState>
    );
  }
  // Die Datenbank erzwingt eine Klassenstufe je Schuljahr; alle Halbjahre
  // eines Schuljahrs nennen also dasselbe Notensystem. Ein Schuljahr, das es
  // nicht mehr gibt (etwa in einem anderen Tab gelöscht), rechnet in Sechsern.
  const system =
    halbjahre.find((halbjahr) => halbjahr.schoolYear === schoolYear)?.system ??
    'sechser';
  return (
    <FaecherManagement
      key={schoolYear}
      operations={operations}
      schoolYear={schoolYear}
      system={system}
    />
  );
};

export const FaecherPage = ({
  noHalbjahrAction = null,
  operations,
}: {
  /** Where to go while there is no Halbjahr, such as a link to the Einstellungen. */
  readonly noHalbjahrAction?: ReactNode;
  readonly operations: FaecherPageOperations;
}) => {
  const halbjahreQuery = useQuery({
    queryFn: operations.listHalbjahre,
    queryKey: halbjahreKey,
  });
  // Die Überschrift steht in jedem Zustand an derselben Stelle, damit ein
  // erfolgreicher neuer Versuch nach gescheitertem ersten Laden sie fokussieren
  // kann.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [chosenSchoolYear, setChosenSchoolYear] = useState<string | null>(null);
  const halbjahre = halbjahreQuery.data;
  const retry = retryWithFocus(() => halbjahreQuery.refetch(), headingRef);
  // Schuljahre, neuestes zuerst, wie die Halbjahre geliefert werden.
  const schoolYears = [
    ...new Set((halbjahre ?? []).map((halbjahr) => halbjahr.schoolYear)),
  ];
  const schoolYear = chosenSchoolYear ?? schoolYears[0] ?? '';
  return (
    <>
      <PageHeader
        headingRef={headingRef}
        lead="Jedes Fach mit der Gewichtung, die die Lehrkraft verkündet hat."
        title="Fächer"
      >
        {schoolYears.length > 1 ? (
          <SchoolYearChoice
            onChange={setChosenSchoolYear}
            schoolYears={schoolYears}
            value={schoolYear}
          />
        ) : null}
      </PageHeader>
      {halbjahreQuery.isPending ? (
        <LoadingHint text="Fächer werden geladen …" />
      ) : null}
      {halbjahreQuery.isError ? (
        <div className="mb-6">
          <QueryError
            onRetry={retry}
            text={
              // Scheitert nur ein Neuladen, bleibt die Seite stehen, damit ein
              // offenes Fachformular samt Eingaben erhalten bleibt.
              halbjahre === undefined
                ? 'Die Schuljahre für die Fachverwaltung konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut.'
                : 'Die Schuljahre für die Fachverwaltung konnten nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut.'
            }
          />
        </div>
      ) : null}
      {halbjahre === undefined ? null : (
        <Schuljahre
          halbjahre={halbjahre}
          noHalbjahrAction={noHalbjahrAction}
          operations={operations}
          schoolYear={schoolYear}
        />
      )}
    </>
  );
};
