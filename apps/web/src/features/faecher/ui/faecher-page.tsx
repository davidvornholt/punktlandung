import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { halbjahreKey } from '#/shared/query/query-keys.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';
import type { FachOperations } from './fach-operations.ts';
import { FaecherManagement } from './faecher-management.tsx';

type SchuljahrMitNotensystem = {
  readonly schoolYear: string;
  readonly system: Notensystem;
};

export type FaecherPageOperations = FachOperations & {
  readonly listHalbjahre: () => Promise<ReadonlyArray<SchuljahrMitNotensystem>>;
};

const heading = 'font-display text-3xl text-ink tracking-tight';

export const FaecherPage = ({
  operations,
}: {
  readonly operations: FaecherPageOperations;
}) => {
  const halbjahreQuery = useQuery({
    queryFn: operations.listHalbjahre,
    queryKey: halbjahreKey,
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const halbjahre = halbjahreQuery.data;
  if (halbjahreQuery.isPending) {
    return (
      <>
        <h1 className={heading}>Fächer</h1>
        <div className="mt-6">
          <LoadingHint text="Fächer werden geladen …" />
        </div>
      </>
    );
  }
  const retry = retryWithFocus(() => halbjahreQuery.refetch(), headingRef);
  // Scheitert nur ein Neuladen, bleibt die Seite stehen, damit ein offenes
  // Fachformular samt Eingaben erhalten bleibt.
  if (halbjahre === undefined) {
    return (
      <>
        <h1 className={heading}>Fächer</h1>
        <div className="mt-6">
          <QueryError
            onRetry={retry}
            text="Die Schuljahre für die Fachverwaltung konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      </>
    );
  }
  // Die Datenbank erzwingt eine Klassenstufe je Schuljahr; alle Halbjahre
  // eines Schuljahrs nennen also dasselbe Notensystem.
  const notensystemBySchoolYear = new Map(
    halbjahre.map((halbjahr) => [halbjahr.schoolYear, halbjahr.system]),
  );
  return (
    <>
      <h1 className={heading} ref={headingRef} tabIndex={-1}>
        Fächer
      </h1>
      <p className="mt-2 text-ink-muted">
        Fächer samt Gewichtung, wie die Lehrkraft sie zu Schuljahresbeginn
        verkündet hat. Änderungen gelten nur für das gewählte Schuljahr.
      </p>
      {halbjahreQuery.isError ? (
        <div className="mt-6">
          <QueryError
            onRetry={retry}
            text="Die Schuljahre für die Fachverwaltung konnten nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      <div className="mt-6">
        <FaecherManagement
          notensystemBySchoolYear={notensystemBySchoolYear}
          operations={operations}
        />
      </div>
    </>
  );
};
