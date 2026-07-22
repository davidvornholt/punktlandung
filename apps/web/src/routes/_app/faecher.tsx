import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { FaecherVerwaltung } from '#/features/faecher/ui/faecher-verwaltung.tsx';
import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';

const FaecherSeite = () => {
  const { data: halbjahre } = useQuery(halbjahreQueryOptions);
  if (halbjahre === undefined) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Fächer
        </h1>
        <p className="mt-6 text-ink-muted">Daten werden geladen …</p>
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
        <FaecherVerwaltung schoolYears={schoolYears} />
      </div>
    </>
  );
};

export const Route = createFileRoute('/_app/faecher')({
  component: FaecherSeite,
});
