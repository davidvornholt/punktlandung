import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { nbsp } from '#/shared/date/date-text.ts';
import { EmptyState } from '#/shared/ui/empty-state.tsx';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import type { DiscWrap } from '#/shared/ui/ruler/disc.tsx';
import { Ruler } from '#/shared/ui/ruler/ruler.tsx';
import type { Zeugnis } from '../services/zeugnis-service.ts';
import { Jahresvorschau } from './jahresvorschau.tsx';
import { figureLabel, zeugnisRuler } from './zeugnis-model.ts';
import { ZeugnisTable } from './zeugnis-table.tsx';
import { legendClass } from './zeugnis-table-classes.ts';
import { legendTexts } from './zeugnis-text.ts';

/** The figure and the table of a Halbjahr in which at least one Fach has a Note. */
const Halbjahresnoten = ({
  today,
  zeugnis,
}: {
  readonly today: string;
  readonly zeugnis: Zeugnis;
}) => {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const model = useMemo(() => zeugnisRuler(zeugnis), [zeugnis]);
  const linkDisc = useMemo<DiscWrap>(
    () => (point, body) => (
      <Link
        aria-label={point.label}
        search={{ halbjahr: zeugnis.termId, fach: point.id }}
        to="/noten"
      >
        {body}
      </Link>
    ),
    [zeugnis.termId],
  );
  return (
    <>
      {/* On a phone the bar runs from one edge of the screen to the other. */}
      <figure className="-mx-4 desk:mx-0">
        <Ruler
          highlightId={highlightId}
          label={figureLabel(zeugnis)}
          model={model}
          onHighlight={setHighlightId}
          system={zeugnis.system}
          today={today}
          variant="zeugnis"
          wrapDisc={linkDisc}
        />
      </figure>
      <div className="@container desk:mt-9 mt-6">
        <div className="grid @[60rem]:grid-cols-[minmax(0,1fr)_16.875rem] items-start gap-x-18 gap-y-2">
          <ZeugnisTable
            highlightId={highlightId}
            onHighlight={setHighlightId}
            zeugnis={zeugnis}
          />
          <div className={legendClass}>
            {legendTexts(zeugnis.system).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const Blank = ({ zeugnis }: { readonly zeugnis: Zeugnis }) =>
  zeugnis.zeilen.length === 0 ? (
    <EmptyState
      text="Ein Zeugnis führt die Fächer eines Schuljahrs auf. Lege zuerst die Fächer an, die du in diesem Schuljahr hast."
      title={`Noch keine Fächer im Schuljahr${nbsp}${zeugnis.schoolYear}`}
    >
      <Link className={primaryButtonClass} to="/faecher">
        Fächer anlegen
      </Link>
    </EmptyState>
  ) : (
    <EmptyState
      text="Sobald ein Fach eine Note hat, landet es hier auf seiner Halbjahresnote."
      title={`Noch keine Note in ${zeugnis.label}`}
    >
      <Link
        className={primaryButtonClass}
        search={{ halbjahr: zeugnis.termId, neu: true }}
        to="/noten"
      >
        Note eintragen
      </Link>
    </EmptyState>
  );

/**
 * The Zeugnis of one Halbjahr: every Fach on its Halbjahresnote, the Schnitt
 * of them under the fulcrum, and the rounding of each Fach in a table.
 */
export const ZeugnisSheet = ({
  today,
  zeugnis,
}: {
  /** ISO date. */
  readonly today: string;
  readonly zeugnis: Zeugnis;
}) => (
  <>
    {zeugnis.gesamtschnittWert === null ? (
      <Blank zeugnis={zeugnis} />
    ) : (
      <Halbjahresnoten today={today} zeugnis={zeugnis} />
    )}
    {zeugnis.jahresvorschau === null ||
    zeugnis.jahresvorschau.length === 0 ? null : (
      <Jahresvorschau
        rows={zeugnis.jahresvorschau}
        schoolYear={zeugnis.schoolYear}
      />
    )}
  </>
);
