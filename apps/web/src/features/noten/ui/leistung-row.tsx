import { useId } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { flag } from '#/shared/ui/ruler/disc-look.ts';
import type { Leistung } from '../services/noten-service.ts';
import { leistungState } from './fach-ruler.ts';
import { RowSummary } from './note-row-summary.tsx';
import { LeistungLink } from './noten-links.tsx';

type RowContext = {
  readonly highlightId: string | null;
  readonly onHighlight: (id: string | null) => void;
  /** What each Leistung of the Fach counts, by id. */
  readonly shares: ReadonlyMap<string, number>;
  readonly system: Notensystem;
  /** ISO date. */
  readonly today: string;
};

/**
 * Another Leistung of the Fach, as the link to its own page. It looks like
 * its row on the Noten page, without what can be done to it there: this page
 * is about one Leistung, and the others are only a step away.
 */
const Row = ({
  context,
  leistung,
}: {
  readonly context: RowContext;
  readonly leistung: Leistung;
}) => {
  const { highlightId, onHighlight, shares, system, today } = context;
  const state = leistungState(leistung, today);
  return (
    <li
      className="border-line-soft border-t transition-colors duration-100 ease-standard first:border-t-0 hover:bg-sheet data-hover:bg-sheet"
      data-hover={flag(highlightId === leistung.id)}
      data-row={leistung.id}
      onPointerEnter={() => onHighlight(leistung.id)}
      onPointerLeave={() => onHighlight(null)}
    >
      <RowSummary
        leistung={leistung}
        link={LeistungLink}
        onHighlight={onHighlight}
        standing={{ share: shares.get(leistung.id) ?? 0, state }}
        system={system}
        today={today}
      />
    </li>
  );
};

/** "Auch in Physik": the other Leistungen of the Fach in this Halbjahr. */
export const LeistungOthers = ({
  fachName,
  leistungen,
  ...context
}: RowContext & {
  readonly fachName: string;
  /** The Leistungen of the Fach without the one the page is about. */
  readonly leistungen: ReadonlyArray<Leistung>;
}) => {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <h2 className="mb-1 font-bold text-lg" id={headingId}>
        Auch in {fachName}
      </h2>
      <ul>
        {leistungen.map((leistung) => (
          <Row context={context} key={leistung.id} leistung={leistung} />
        ))}
      </ul>
    </section>
  );
};
