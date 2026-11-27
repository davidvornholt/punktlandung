import { Plus } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { gewichtungsSaetze } from '#/shared/noten/gewichtung-text.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { buttonClass } from '#/shared/ui/form-classes.ts';
import { buttonIconSize, iconStroke } from '#/shared/ui/icon.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import type { DiscWrap } from '#/shared/ui/ruler/disc.tsx';
import type { Leistung } from '../services/noten-service.ts';
import { fachRuler } from './fach-ruler.ts';
import { NoteRow, type RowFigure } from './note-row.tsx';
import { type NoteEntryState, NotenBench } from './noten-bench.tsx';
import { DotLine } from './noten-dot-line.tsx';
import type { LeistungLinkComponent } from './noten-links.tsx';
import {
  type FachGroup,
  metaText,
  type UpdateErrors,
} from './noten-list-model.ts';
import { dotSeparator } from './noten-text.ts';

/** What every Fach of the page shares: the Halbjahr, the day, and what the rows do. */
export type FachSectionContext = {
  readonly halbjahr: {
    readonly system: Notensystem;
    readonly startsOn: string;
    readonly endsOn: string;
  };
  /** ISO date. */
  readonly today: string;
  readonly link: LeistungLinkComponent;
  readonly deleteErrors: UpdateErrors;
  readonly deleteMutation: ListMutation<string>;
  /** Changes that failed after their form was closed, by Leistung. */
  readonly savedErrors: UpdateErrors;
  /** The Leistung that was just saved: its disc lands and its row is marked. */
  readonly landedId: string | null;
  readonly onAdd: (fachId: string) => void;
  readonly onDelete: (leistung: Leistung) => void;
  readonly onEdit: (leistung: Leistung, trigger: HTMLButtonElement) => void;
};

const FachHead = ({
  entering,
  group,
  headingId,
  meta,
  onAdd,
}: {
  readonly entering: boolean;
  readonly group: FachGroup;
  readonly headingId: string;
  /** "2 Noten", "1 ausstehend", … */
  readonly meta: ReadonlyArray<string>;
  readonly onAdd: () => void;
}) => (
  <div className="desk:flex grid grid-cols-[minmax(0,1fr)_auto] items-baseline desk:gap-x-4 gap-x-3 gap-y-0.5">
    <h2
      // A Fach name is often one long word, and on a phone it shares its line with the button.
      className="wrap-break-word min-w-0 hyphens-auto font-bold desk:text-2xl text-[1.375rem] tracking-[-0.01em]"
      data-fach-heading=""
      id={headingId}
      tabIndex={-1}
    >
      {group.name}
    </h2>
    {/* On a phone the line runs under the button too, and breaks only between its parts. */}
    <p className="col-span-full row-start-2 desk:text-[0.875rem] text-ink-soft text-sm">
      <DotLine parts={meta} />
    </p>
    {group.archived ? null : (
      <button
        className={`${buttonClass('secondary', 'compact')} desk:ml-auto self-center ${entering ? 'invisible' : ''}`}
        data-add-note={group.id}
        onClick={onAdd}
        type="button"
      >
        <Plus
          aria-hidden={true}
          size={buttonIconSize}
          strokeWidth={iconStroke}
        />
        Note eintragen
      </button>
    )}
  </div>
);

/** "So zählt Deutsch: Schriftlich 60 % : mündlich 40 %, …" */
const Regel = ({ group }: { readonly group: FachGroup }) => (
  <p className="mt-4 pl-1 text-ink-soft text-sm leading-normal">
    <b className="text-ink">So zählt {group.name}:</b>{' '}
    {gewichtungsSaetze(group.gewichtung).join(', ')}.
  </p>
);

export type NotenFachSectionProps = {
  readonly context: FachSectionContext;
  /** The entry that is open on this Fach's bench; `null` when there is none. */
  readonly entry: NoteEntryState | null;
  readonly group: FachGroup;
};

/**
 * One Fach of the Noten page: its bench, and beside it the list of what lies
 * on it. While a Note is entered, the form takes the place of the list.
 */
export const NotenFachSection = ({
  context,
  entry,
  group,
}: NotenFachSectionProps) => {
  const headingId = useId();
  // A row and its disc point at each other: what is under the pointer in one is marked in the other.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const { halbjahr, link: LinkTo, today } = context;
  const ruler = useMemo(
    () =>
      fachRuler({
        gewichtung: group.gewichtung,
        leistungen: group.leistungen,
        system: halbjahr.system,
        today,
      }),
    [group.gewichtung, group.leistungen, halbjahr.system, today],
  );
  const figures = new Map<string, RowFigure>(
    ruler.model.points.map((point) => [
      point.id,
      {
        share: point.mass,
        state: point.state,
        label: point.label ?? '',
      },
    ]),
  );
  const linkDisc = useMemo<DiscWrap>(
    () => (point, body) => (
      <LinkTo
        id={point.id}
        {...(point.label === undefined ? {} : { label: point.label })}
      >
        {body}
      </LinkTo>
    ),
    [LinkTo],
  );
  return (
    <section
      aria-labelledby={headingId}
      // On a phone a Fach that is jumped to stops right under the strip of Fächer, which draws the line itself: there and above the first Fach.
      className="desk:scroll-mt-0 scroll-mt-6 border-line border-t desk:pt-6 pt-5 desk:pb-[2.125rem] pb-[1.625rem] max-desk:[nav+&]:border-t-0"
      data-fach={group.id}
    >
      <FachHead
        entering={entry !== null}
        group={group}
        headingId={headingId}
        meta={[
          ...(group.archived ? ['Archiviert'] : []),
          ...metaText({
            evaluation: ruler.evaluation,
            leistungen: group.leistungen,
          }).split(dotSeparator),
        ]}
        onAdd={() => context.onAdd(group.id)}
      />
      <NotenBench
        entry={entry}
        fach={group}
        halbjahr={halbjahr}
        highlightId={highlightId}
        landingId={context.landedId}
        leistungen={group.leistungen}
        onHighlight={setHighlightId}
        today={today}
        wrapDisc={linkDisc}
      >
        {({ bench, readout, form }) => (
          // The list stands beside the bar only where the bar keeps a width worth reading; in a narrower window it follows below, as on a phone.
          <div className="mt-1.5 grid gap-y-1 min-[64rem]:grid-cols-[minmax(0,1fr)_30rem] min-[64rem]:gap-x-12">
            <div className="min-w-0">
              {/* On a phone the bar runs from one edge of the screen to the other. From the width at which the ruler keeps room beside the bar for what waits, it would touch only the left edge, so it stays inside the page. */}
              <div className="-mx-4 min-[35rem]:mx-0">{bench}</div>
              {readout}
            </div>
            <div className="min-w-0 pt-2 min-[64rem]:pt-2.5">
              {form}
              {/* The list stays in the page while the form covers it, so the button that opened the form is still there to return to. */}
              <div hidden={form !== null}>
                {group.leistungen.length === 0 ? (
                  <p className="pl-1 text-ink-soft">
                    Noch keine Note in {group.name}.
                  </p>
                ) : (
                  <ul aria-label={`Noten in ${group.name}`}>
                    {group.leistungen.map((leistung, index) => (
                      <NoteRow
                        deleteError={
                          context.deleteErrors.get(leistung.id) ?? null
                        }
                        deleteMutation={context.deleteMutation}
                        figure={
                          figures.get(leistung.id) ?? {
                            share: 0,
                            state: 'graded',
                            label: '',
                          }
                        }
                        highlighted={highlightId === leistung.id}
                        key={leistung.id}
                        leistung={leistung}
                        link={LinkTo}
                        marked={context.landedId === leistung.id}
                        onDelete={context.onDelete}
                        onEdit={context.onEdit}
                        onHighlight={setHighlightId}
                        position={index + 1}
                        savedError={context.savedErrors.get(leistung.id)}
                        system={halbjahr.system}
                        today={today}
                      />
                    ))}
                  </ul>
                )}
                <Regel group={group} />
              </div>
            </div>
          </div>
        )}
      </NotenBench>
    </section>
  );
};
