import { useMemo, useState } from 'react';

import type { DiscWrap } from '#/shared/ui/ruler/disc.tsx';
import { leistungShares } from './fach-ruler.ts';
import { LeistungActions } from './leistung-actions.tsx';
import {
  deleteQuestion,
  dimensionText,
  fachShares,
  shareHeading,
  shareLabel,
  shareParts,
  shareSentence,
  standingOf,
  standingSentence,
} from './leistung-model.ts';
import { LeistungOthers } from './leistung-row.tsx';
import { LeistungShare } from './leistung-share.tsx';
import { type LeistungPageInput, useLeistungPage } from './leistung-state.ts';
import { NotenBench } from './noten-bench.tsx';
import { NotenChooser } from './noten-chooser.tsx';
import { LeistungLink } from './noten-links.tsx';
import { tieUnits } from './noten-text.ts';

export type LeistungPageProps = LeistungPageInput & {
  /** ISO date. */
  readonly today: string;
};

/**
 * The page of a Leistung below its head: the bench of its Fach with the
 * Leistung marked on it and one sentence on what it does to the Fachschnitt,
 * then what can be done to it, how much it counts, and the other Leistungen
 * of the Fach. Its Note is entered and changed on this bench.
 */
export const LeistungPage = (props: LeistungPageProps) => {
  const { detail, today } = props;
  const { halbjahr, leistung } = detail;
  const { system } = halbjahr;
  const page = useLeistungPage(props);
  const { leistungen } = page;
  // A row, a piece of the share bar and a disc point at each other: what is under the pointer in one is marked in the others.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const figures = useMemo(() => {
    const fach = { gewichtung: leistung.gewichtung, leistungen };
    const standing = standingOf({ ...fach, leistung, system, today });
    const shares = fachShares(fach);
    return {
      dimension: dimensionText(standing, system),
      sentence: tieUnits(
        standingSentence({
          fachName: leistung.fachName,
          kind: leistung.kind,
          standing,
          system,
        }),
      ),
      shareSentence: tieUnits(shareSentence({ leistung, leistungen, shares })),
      shareParts: shareParts({ leistung, leistungen, shares }),
      rowShares: leistungShares(leistungen, leistung.gewichtung),
    };
  }, [leistung, leistungen, system, today]);
  const others = leistungen.filter((other) => other.id !== leistung.id);
  const ownId = leistung.id;
  // The disc of the Leistung itself leads nowhere: this is its page.
  const linkDisc = useMemo<DiscWrap>(
    () => (point, body) =>
      point.id === ownId ? (
        body
      ) : (
        <LeistungLink
          id={point.id}
          {...(point.label === undefined ? {} : { label: point.label })}
        >
          {body}
        </LeistungLink>
      ),
    [ownId],
  );
  return (
    <div ref={page.regionRef}>
      <p className="sr-only" role="status">
        {page.announcement}
      </p>
      <NotenBench
        dimension={
          page.bench.own && figures.dimension !== null
            ? { id: leistung.id, text: figures.dimension }
            : null
        }
        entry={page.bench.entry}
        fach={page.bench.fach}
        halbjahr={halbjahr}
        highlightId={highlightId}
        landingId={page.bench.landingId}
        leistungen={page.bench.leistungen}
        onHighlight={setHighlightId}
        today={today}
        wrapDisc={linkDisc}
        {...(page.bench.own ? { focusId: leistung.id } : {})}
      >
        {({ bench, readout, form }) => (
          <div className="mt-5" data-fach={page.bench.fach.id}>
            {/* On a phone the bar runs from one edge of the screen to the other. From the width at which the ruler keeps room beside the bar for what waits, it would touch only the left edge, so it stays inside the page. */}
            <div className="-mx-4 min-[35rem]:mx-0">{bench}</div>
            {readout ?? (
              <p
                className="mt-2.5 max-w-[70ch] text-[0.90625rem] text-ink-soft leading-normal"
                data-leistung-standing=""
              >
                {figures.sentence}
              </p>
            )}
            {page.chooser === null ? (
              <div className="desk:mt-9 mt-6 grid desk:grid-cols-[5fr_6fr] desk:gap-x-[4.5rem] gap-y-[1.875rem]">
                <div className="min-w-0">
                  {form}
                  {/* What the form covers stays in the page, so the button that opened it is still there to return to. */}
                  <div hidden={page.entering}>
                    <LeistungActions
                      {...page.actions}
                      entryButtonRef={page.entryButtonRef}
                      graded={leistung.status === 'graded'}
                      question={deleteQuestion(leistung)}
                    />
                    <LeistungShare
                      fachName={leistung.fachName}
                      gewichtung={leistung.gewichtung}
                      heading={shareHeading(leistung.kind)}
                      highlightId={highlightId}
                      label={shareLabel(leistung.kind)}
                      onHighlight={setHighlightId}
                      parts={figures.shareParts}
                      sentence={figures.shareSentence}
                    />
                  </div>
                </div>
                {others.length === 0 ? null : (
                  <LeistungOthers
                    fachName={leistung.fachName}
                    highlightId={highlightId}
                    leistungen={others}
                    onHighlight={setHighlightId}
                    shares={figures.rowShares}
                    system={system}
                    today={today}
                  />
                )}
              </div>
            ) : (
              <div className="desk:mt-9 mt-6">
                <NotenChooser
                  groups={page.chooser.groups}
                  moving={leistung}
                  onCancel={page.chooser.onCancel}
                  onPick={page.chooser.onPick}
                  system={system}
                  today={today}
                />
              </div>
            )}
          </div>
        )}
      </NotenBench>
    </div>
  );
};
