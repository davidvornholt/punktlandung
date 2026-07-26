import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { FaecherManagement } from '#/features/faecher/ui/faecher-management.tsx';
import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';

const FaecherPage = () => {
  const halbjahreQuery = useQuery(halbjahreQueryOptions);
  const halbjahre = halbjahreQuery.data;
  if (halbjahreQuery.isPending) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Fächer
        </h1>
        <div className="mt-6">
          <LoadingHint text="Fächer werden geladen …" />
        </div>
      </>
    );
  }
  if (halbjahreQuery.isError || halbjahre === undefined) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Fächer
        </h1>
        <div className="mt-6">
          <QueryError
            onRetry={() => halbjahreQuery.refetch()}
            text="Die Schuljahre für die Fachverwaltung konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      </>
    );
  }
  const schoolYears = [
    ...new Set(halbjahre.map((halbjahr) => halbjahr.schoolYear)),
  ];
  return (
    <>
      <h1 className="font-display text-3xl text-ink tracking-tight">Fächer</h1>
      <p className="mt-2 text-ink-muted">
        Fächer samt Gewichtung, wie die Lehrkraft sie zu Schuljahresbeginn
        verkündet hat. Änderungen gelten nur für das gewählte Schuljahr.
      </p>
      <div className="mt-6">
        <FaecherManagement schoolYears={schoolYears} />
      </div>
    </>
  );
};

export const Route = createFileRoute('/_app/faecher')({
  component: FaecherPage,
  head: () => ({ meta: [{ title: pageTitle('Fächer') }] }),
});
