import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { FaecherVerwaltung } from '#/features/faecher/ui/faecher-verwaltung.tsx';
import { halbjahreQueryOptions } from '#/features/halbjahre/server/halbjahr-fns.ts';
import { AbfrageFehler, Ladehinweis } from '#/shared/ui/abfrage-zustand.tsx';
import { seitentitel } from '#/shared/ui/seitentitel.ts';

const FaecherSeite = () => {
  const halbjahreAbfrage = useQuery(halbjahreQueryOptions);
  const halbjahre = halbjahreAbfrage.data;
  if (halbjahreAbfrage.isPending) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Fächer
        </h1>
        <div className="mt-6">
          <Ladehinweis text="Fächer werden geladen …" />
        </div>
      </>
    );
  }
  if (halbjahreAbfrage.isError || halbjahre === undefined) {
    return (
      <>
        <h1 className="font-display text-3xl text-ink tracking-tight">
          Fächer
        </h1>
        <div className="mt-6">
          <AbfrageFehler
            onWiederholen={() => halbjahreAbfrage.refetch()}
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
        <FaecherVerwaltung schoolYears={schoolYears} />
      </div>
    </>
  );
};

export const Route = createFileRoute('/_app/faecher')({
  component: FaecherSeite,
  head: () => ({ meta: [{ title: seitentitel('Fächer') }] }),
});
