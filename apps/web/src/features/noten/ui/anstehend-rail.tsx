import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { relativeDayText } from '#/shared/date/date-text.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import { upcomingKey } from '#/shared/query/query-keys.ts';
import { Flag } from '#/shared/ui/flag.tsx';
import { linkClass } from '#/shared/ui/form-classes.ts';
import { SectionHeader } from '#/shared/ui/page-header.tsx';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';
import { WarnStripes } from '#/shared/ui/ruler/disc.tsx';
import { tenths } from '#/shared/ui/ruler/geometry.ts';
import { useHostWidth } from '#/shared/ui/ruler/ruler-hooks.ts';
import type {
  Upcoming,
  UpcomingLeistung,
} from '../services/upcoming-calculation.ts';
import {
  type RailLayout,
  railItemHeight,
  railLayout,
} from './anstehend-layout.ts';
import { useIsDesk } from './overview-media.ts';
import { sinceText, whenText } from './upcoming-text.ts';

const ring = { minRadius: 7, fullRadius: 24 } as const;

const axisText = { size: 11.5, dy: 4, markHalf: 12, room: 28 } as const;

const notIdCharacters = /[^a-z0-9]/giu;

/**
 * One Leistung on the rail, as a link to it. The ring's area is the share of
 * the Fachschnitt its Note will carry. A Leistung whose date has passed
 * wears the warning stripes, and its link opens the entry of the Note.
 */
const RailItem = ({ leistung }: { readonly leistung: UpcomingLeistung }) => {
  const missing = leistung.tageBis < 0;
  const stripesId = `stripes-${useId().replaceAll(notIdCharacters, '')}`;
  return (
    <Link
      className="group absolute inset-x-0 grid min-h-12 -translate-y-1/2 desk:grid-cols-[92px_minmax(0,1fr)_auto] grid-cols-[62px_minmax(0,1fr)_auto] content-center items-center desk:gap-x-3 gap-x-2.5 py-0.5"
      data-part="rail-item"
      params={{ id: leistung.id }}
      search={missing ? { eintragen: true } : {}}
      to="/noten/$id"
    >
      <svg
        aria-hidden="true"
        className="row-span-2 desk:ml-8 ml-4 justify-self-start overflow-visible group-hover:[--disc-stroke-width:2.5]"
        data-look={missing ? 'missing' : 'pending'}
        height={48}
        viewBox="-28 -24 56 48"
        width={56}
      >
        {missing ? (
          <defs>
            <WarnStripes id={stripesId} />
          </defs>
        ) : null}
        <circle
          data-part="disc-body"
          fill={missing ? `url(#${stripesId})` : undefined}
          r={tenths(
            Math.max(
              ring.minRadius,
              ring.fullRadius * Math.sqrt(leistung.anteil),
            ),
          )}
        />
      </svg>
      <span className="col-span-2 desk:col-span-1 desk:text-base text-ui leading-[1.3]">
        {/* The link is named by what it prints. Only where it leads is not printed. */}
        {missing ? <span className="sr-only">Note eintragen: </span> : null}
        <b className="font-bold decoration-[1.5px] underline-offset-[3px] group-hover:underline">
          {leistung.fachName}
        </b>{' '}
        {leistungsartLabel[leistung.kind]}
        {leistung.notiz === null || missing ? null : ` · ${leistung.notiz}`}
      </span>
      <span className="col-start-2 text-ink-soft text-sm">
        {whenText(leistung)}
      </span>
      {missing ? (
        <span className="col-span-2 desk:col-span-1 col-start-2 desk:col-start-3 desk:row-span-2 desk:row-start-1 desk:mt-0 mt-1 desk:block flex items-center gap-2.5 whitespace-nowrap desk:text-right text-ink-soft text-sm">
          <Flag>Note fehlt noch</Flag>
          <span className="desk:mt-0.5 desk:block">{sinceText(leistung)}</span>
        </span>
      ) : (
        <b className="col-start-3 desk:row-span-2 desk:row-start-1 whitespace-nowrap text-right font-bold desk:text-lg text-ui">
          {relativeDayText(leistung.tageBis)}
        </b>
      )}
    </Link>
  );
};

/** The axis: today's mark, a tick per day and the Mondays by their date. */
const RailAxis = ({ layout }: { readonly layout: RailLayout }) => (
  <svg
    aria-hidden="true"
    className="absolute top-0 left-0 overflow-visible"
    height={layout.height}
    width={layout.axis + axisText.room}
  >
    <path
      className="stroke-[1.5] stroke-ink"
      d={`M${layout.axis} ${layout.axisFrom}V${layout.height}`}
    />
    <path className="stroke-ink opacity-55" d={layout.ticks} />
    <path
      className="stroke-2 stroke-ink"
      d={`M${layout.axis - axisText.markHalf} ${layout.zero}h${axisText.markHalf * 2}`}
    />
    <text
      className="font-bold"
      fontSize={axisText.size}
      textAnchor="end"
      x={layout.labelX}
      y={layout.zero + axisText.dy}
    >
      heute
    </text>
    {layout.weeks.map((week) => (
      <text
        className="fill-ink-soft"
        fontSize={axisText.size}
        key={week.text}
        textAnchor="end"
        x={layout.labelX}
        y={week.y + axisText.dy}
      >
        {week.text}
      </text>
    ))}
  </svg>
);

/**
 * The rail with everything on it. Where an item stands depends on how tall
 * its text runs, so the items are measured first and placed then; both happen
 * before the browser paints.
 */
const Rail = ({
  today,
  upcoming,
}: {
  readonly today: string;
  readonly upcoming: Upcoming;
}) => {
  const railRef = useRef<HTMLDivElement>(null);
  const width = useHostWidth(railRef);
  const desk = useIsDesk();
  const [heights, setHeights] = useState<ReadonlyArray<number>>([]);
  const leistungen = useMemo(
    () => [...upcoming.overdue, ...upcoming.upcoming],
    [upcoming],
  );
  const layout = useMemo(() => {
    const heightOf = (index: number): number =>
      heights[index] ?? railItemHeight;
    return railLayout({
      items: {
        missing: upcoming.overdue.map((_, index) => heightOf(index)),
        upcoming: upcoming.upcoming.map((leistung, index) => ({
          day: Math.max(0, leistung.tageBis),
          height: heightOf(upcoming.overdue.length + index),
        })),
      },
      phone: !desk,
      today,
    });
  }, [desk, heights, today, upcoming]);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (rail === null || width === null) {
      return;
    }
    const items = [
      ...rail.querySelectorAll<HTMLElement>('[data-part="rail-item"]'),
    ];
    const measured = items.map((item) => item.offsetHeight);
    if (
      measured.length !== heights.length ||
      measured.some((height, index) => height !== heights[index])
    ) {
      setHeights(measured);
      return;
    }
    const tops = [...layout.missing, ...layout.upcoming];
    for (const [index, item] of items.entries()) {
      item.style.top = `${tops[index] ?? 0}px`;
    }
    rail.style.height = `${layout.height}px`;
  }, [heights, layout, width]);

  return (
    <div className="relative" ref={railRef}>
      <RailAxis layout={layout} />
      <ol>
        {leistungen.map((leistung) => (
          <li key={leistung.id}>
            <RailItem leistung={leistung} />
          </li>
        ))}
      </ol>
    </div>
  );
};

const isEmpty = (upcoming: Upcoming): boolean =>
  upcoming.upcoming.length === 0 && upcoming.overdue.length === 0;

/**
 * "Anstehend" on the Übersicht: what is still to be written, on a time rail
 * that starts today, and above today what has been written but has no Note
 * yet. The server call comes in as `load`, so the block renders and is tested
 * without the runtime of the server functions.
 */
export const AnstehendRail = ({
  load,
  today,
}: {
  readonly load: () => Promise<Upcoming>;
  /** ISO date. */
  readonly today: string;
}) => {
  const query = useQuery({ queryKey: upcomingKey, queryFn: load });
  const sectionRef = useRef<HTMLElement>(null);
  const upcoming = query.data;
  return (
    <section
      aria-label="Anstehend"
      className="focus-visible:outline-none"
      ref={sectionRef}
      tabIndex={-1}
    >
      <SectionHeader title="Anstehend">
        {upcoming === undefined || isEmpty(upcoming)
          ? undefined
          : 'Kreisgröße: Anteil am Fachschnitt'}
      </SectionHeader>
      {query.isPending ? (
        <LoadingHint text="Anstehende Leistungen werden geladen …" />
      ) : null}
      {query.isError ? (
        <div className="mb-4">
          <QueryError
            onRetry={retryWithFocus(() => query.refetch(), sectionRef)}
            text="Die anstehenden Leistungen konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {upcoming !== undefined && isEmpty(upcoming) ? (
        <p className="max-w-[60ch] text-ink-soft">
          Nichts angekündigt. Eine Klausur, einen Test oder eine GFS trägst du
          unter{' '}
          <Link className={`${linkClass} text-ink`} to="/noten">
            Noten
          </Link>{' '}
          ohne Note ein, dann wartet sie hier.
        </p>
      ) : null}
      {upcoming === undefined || isEmpty(upcoming) ? null : (
        <Rail today={today} upcoming={upcoming} />
      )}
    </section>
  );
};
