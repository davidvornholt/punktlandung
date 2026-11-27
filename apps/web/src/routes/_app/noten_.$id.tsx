import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { faecherQueryOptions } from '#/features/faecher/server/fach-fns.ts';
import { LeistungDetail } from '#/features/noten/ui/leistung-detail.tsx';
import { tabNameOf } from '#/features/noten/ui/leistung-model.ts';
import { liveLeistungOperations } from '#/features/noten/ui/leistung-operations.ts';
import { leistungQueryOptions } from '#/features/noten/ui/leistung-queries.ts';
import { liveNotenOperations } from '#/features/noten/ui/noten-operations.ts';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { parseLeistungSearch } from '#/shared/ui/page-search.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';

/** What the tab is called until the Leistung is loaded, and when it cannot be. */
const fallbackTabName = 'Leistung';

/**
 * Names the tab after the Leistung. The route only knows an id and loads the
 * Leistung on the page, so its `head` cannot name it; the name is written
 * once the Leistung is there. Leaving the page gives the tab the title of
 * the next route.
 */
const useTabName = (name: string): void => {
  useEffect(() => {
    document.title = pageTitle(name);
  }, [name]);
};

const LeistungPage = () => {
  const { id } = Route.useParams();
  const { eintragen } = Route.useSearch();
  const navigate = Route.useNavigate();
  /*
   * A Leistung can be moved to another Fach of its school year, and only the
   * loaded Leistung knows that year. The Fächer therefore hang on the query
   * the page itself uses, which the two share through the cache.
   */
  const detailQuery = useQuery(
    leistungQueryOptions(liveLeistungOperations, id),
  );
  const schoolYear = detailQuery.data?.halbjahr.schoolYear;
  const leistung = detailQuery.data?.leistung;
  useTabName(leistung === undefined ? fallbackTabName : tabNameOf(leistung));
  const faecherQuery = useQuery({
    ...faecherQueryOptions(schoolYear ?? ''),
    enabled: schoolYear !== undefined,
  });
  return (
    <LeistungDetail
      eintragen={eintragen === true}
      faecher={faecherQuery.data ?? null}
      // What is open on the page belongs to one Leistung; the next one starts with nothing open.
      key={id}
      leistungId={id}
      leistungOperations={liveLeistungOperations}
      notenOperations={liveNotenOperations}
      onDeleted={({ fachId, halbjahrId }) =>
        navigate({
          search: { halbjahr: halbjahrId, fach: fachId },
          to: '/noten',
        })
      }
      // Closing the entry keeps the page where it is; only the address stops asking for it.
      onEntryAnswered={() =>
        navigate({ replace: true, resetScroll: false, search: {} })
      }
      today={berlinCalendarDate()}
    />
  );
};

export const Route = createFileRoute('/_app/noten_/$id')({
  component: LeistungPage,
  head: () => ({ meta: [{ title: pageTitle(fallbackTabName) }] }),
  validateSearch: parseLeistungSearch,
});
