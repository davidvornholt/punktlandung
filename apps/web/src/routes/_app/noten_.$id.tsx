import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { faecherQueryOptions } from '#/features/faecher/server/fach-fns.ts';
import { LeistungDetail } from '#/features/noten/ui/leistung-detail.tsx';
import { liveLeistungOperations } from '#/features/noten/ui/leistung-operations.ts';
import { liveNotenOperations } from '#/features/noten/ui/noten-operations.ts';
import { leistungKey } from '#/shared/query/query-keys.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';

const LeistungPage = () => {
  const { id } = Route.useParams();
  /*
   * Das Notenformular braucht den Fachstand des Schuljahrs der Leistung; das
   * Schuljahr kennt erst die geladene Leistung. Die Fächerabfrage hängt sich
   * deshalb an dieselbe Detailabfrage, die auch die Seite nutzt.
   */
  const detailQuery = useQuery({
    queryFn: () => liveLeistungOperations.load(id),
    queryKey: leistungKey(id),
  });
  const schoolYear = detailQuery.data?.halbjahr.schoolYear;
  const faecherQuery = useQuery({
    ...faecherQueryOptions(schoolYear ?? ''),
    enabled: schoolYear !== undefined,
  });
  return (
    <LeistungDetail
      faecher={faecherQuery.data ?? null}
      leistungId={id}
      leistungOperations={liveLeistungOperations}
      notenOperations={liveNotenOperations}
    />
  );
};

export const Route = createFileRoute('/_app/noten_/$id')({
  component: LeistungPage,
  head: () => ({ meta: [{ title: pageTitle('Leistung') }] }),
});
