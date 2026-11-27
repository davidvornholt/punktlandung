import { useId, useLayoutEffect, useRef } from 'react';

import { anteilText } from '#/shared/noten/anteil-text.ts';
import { gewichtungsSaetze } from '#/shared/noten/gewichtung-text.ts';
import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import { flag } from '#/shared/ui/ruler/disc-look.ts';
import type { SharePart } from './leistung-model.ts';

/** From this share on, the figure fits inside its piece on the narrowest phone. */
const figureFits = 0.14;

/** The middle of the bar: a label hangs towards the side that has the room for it. */
const middle = 0.5;

/** Which edge of each piece its label would hang from, by id: the one nearer to the end of the bar. */
const labelSides = (
  parts: ReadonlyArray<SharePart>,
): ReadonlyMap<string, 'left' | 'right'> => {
  const sides = new Map<string, 'left' | 'right'>();
  let before = 0;
  for (const part of parts) {
    sides.set(part.id, before + part.share / 2 > middle ? 'right' : 'left');
    before += part.share;
  }
  return sides;
};

/**
 * One Leistung's piece of the bar. Its width is its share, which only the
 * data knows, so it is set on the element once it is there.
 */
const Piece = ({
  highlighted,
  label,
  onHighlight,
  part,
}: {
  readonly highlighted: boolean;
  /** Names the piece of the Leistung the page is about, and the edge the name hangs from; `null` on every other piece. */
  readonly label: {
    readonly text: string;
    readonly side: 'left' | 'right';
  } | null;
  readonly onHighlight: (id: string | null) => void;
  readonly part: SharePart;
}) => {
  const pieceRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (pieceRef.current !== null) {
      pieceRef.current.style.flexGrow = `${part.share}`;
    }
  }, [part.share]);
  return (
    <span
      className="relative flex min-w-1.5 basis-0 items-center justify-center border-[1.25px] border-ink bg-line-soft text-sm transition-colors duration-100 ease-standard data-mine:data-open:border-[1.75px] data-hover:data-open:bg-line-soft data-mine:data-open:bg-sheet data-mine:data-open:text-ink data-open:border-dashed data-hover:bg-line data-mine:bg-ink data-open:bg-transparent data-mine:text-paper"
      data-hover={flag(highlighted && !part.mine)}
      data-mine={flag(part.mine)}
      data-open={flag(part.open)}
      data-share-of={part.id}
      data-tip={part.tip}
      onPointerEnter={() => onHighlight(part.id)}
      onPointerLeave={() => onHighlight(null)}
      ref={pieceRef}
    >
      {part.mine && part.share >= figureFits ? (
        <b>{anteilText(part.share)}</b>
      ) : null}
      {/*
       * The piece is named where it is, the way a part is named in a drawing:
       * its edge runs on below the bar, and the name stands beside that line.
       * However narrow the piece is, the name has room there.
       */}
      {label === null ? null : (
        <span
          className="absolute top-full whitespace-nowrap border-ink pt-1.5 font-bold text-ink text-xs data-[side=right]:-right-[1.25px] data-[side=left]:-left-[1.25px] data-[side=right]:border-r-[1.25px] data-[side=left]:border-l-[1.25px] data-[side=right]:pr-1.5 data-[side=left]:pl-1.5"
          data-share-label=""
          data-side={label.side}
        >
          {label.text}
        </span>
      )}
    </span>
  );
};

/**
 * How much the Leistung counts: the Fachschnitt as one bar, cut into the
 * shares of its Leistungen with this one filled in, and the same in a
 * sentence. Below it the rule of the Fach the shares follow from.
 */
export const LeistungShare = ({
  fachName,
  gewichtung,
  heading,
  highlightId,
  label,
  onHighlight,
  parts,
  sentence,
}: {
  readonly fachName: string;
  readonly gewichtung: Fachgewichtung;
  /** "So viel zählt sie" */
  readonly heading: string;
  readonly highlightId: string | null;
  /** "Diese Klausur": the name of the piece the page is about. */
  readonly label: string;
  readonly onHighlight: (id: string | null) => void;
  readonly parts: ReadonlyArray<SharePart>;
  readonly sentence: string;
}) => {
  const headingId = useId();
  const sides = labelSides(parts);
  return (
    <section aria-labelledby={headingId} className="mt-[1.875rem]">
      <h2 className="mb-2.5 font-bold text-lg" id={headingId}>
        {heading}
      </h2>
      {/* The sentence below says what the bar shows. Under the bar is the room for the name of the one piece. */}
      <div aria-hidden="true" className="mb-9 flex h-8 gap-[3px]">
        {parts.map((part) => (
          <Piece
            highlighted={highlightId === part.id}
            key={part.id}
            label={
              part.mine
                ? { text: label, side: sides.get(part.id) ?? 'left' }
                : null
            }
            onHighlight={onHighlight}
            part={part}
          />
        ))}
      </div>
      <p className="text-[0.90625rem] leading-normal">{sentence}</p>
      <p className="mt-2.5 text-ink-soft text-sm leading-normal">
        <b className="text-ink">So zählt {fachName}:</b>{' '}
        {gewichtungsSaetze(gewichtung).join(', ')}.
      </p>
    </section>
  );
};
