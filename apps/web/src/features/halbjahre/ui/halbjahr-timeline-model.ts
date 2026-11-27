import { daysBetween, formatIsoDate } from '#/shared/date/calendar-date.ts';
import { monthOf, shiftMonth } from '#/shared/date/calendar-month.ts';
import { addDays, monthNames } from '#/shared/date/date-text.ts';
import { notensystemText } from '#/shared/noten/notensystem-text.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import {
  formatHalbjahrLabel,
  notensystemForKlassenstufe,
} from '#/shared/school/klassenstufe.ts';
import {
  halbjahrDateRange,
  schoolYearForDate,
} from '#/shared/school/school-year.ts';
import {
  type HalbjahrLook,
  halbjahrLooks,
  type Stretch,
} from './halbjahr-look.ts';

/**
 * The Halbjahre as stretches on one line of time. Everything here is plain
 * arithmetic on ISO dates, so the figure is true to the dates and can be
 * tested without drawing it.
 */

/** The Halbjahr the form is about, drawn where its dates would put it. */
export type TimelineCandidate = Omit<Stretch, 'id'> & {
  /** The id of the Halbjahr being changed; `null` for a new one. */
  readonly replaces: string | null;
};

/** The id the candidate carries on the line. */
export const candidateId = 'candidate';

export type TimelineSegment = {
  readonly id: string;
  /** "J1.1" */
  readonly label: string;
  readonly look: HalbjahrLook | 'candidate';
  readonly system: Notensystem;
  /** "J1.1 · 01.08.2026 bis 31.01.2027 · Notenpunkte 0–15" */
  readonly tip: string;
  readonly width: number;
  readonly x: number;
};

export type TimelineTick = {
  /** A school year begins, its second Halbjahr begins, or a month does. */
  readonly kind: 'year' | 'half' | 'month';
  readonly x: number;
};

export type TimelineName = {
  readonly id: string;
  readonly text: string;
  /** The centre of the text. */
  readonly x: number;
};

/** A run of Halbjahre that share their Notensystem. */
export type TimelineBracket = {
  /** The Notensystem, said as long as the room under the run allows; `null` when nothing fits. */
  readonly caption: {
    readonly text: string;
    readonly width: number;
  } | null;
  readonly from: number;
  readonly key: string;
  readonly to: number;
};

export type Timeline = {
  readonly brackets: ReadonlyArray<TimelineBracket>;
  readonly names: ReadonlyArray<TimelineName>;
  readonly segments: ReadonlyArray<TimelineSegment>;
  /** Says the figure in words. */
  readonly summary: string;
  readonly ticks: ReadonlyArray<TimelineTick>;
  /** Where today lies, and where its word stands so it stays inside the figure. */
  readonly today: { readonly labelX: number; readonly x: number } | null;
  readonly width: number;
};

const frame = {
  /** Room at both ends for the line a segment is drawn with. */
  inset: 1,
  /** The width of one character of a Halbjahr's name, measured in B612 at 12.5 px bold. */
  nameCharacter: 7,
  nameGap: 7,
  /** The width of one character of a caption, measured in B612 at 11.5 px. */
  captionCharacter: 6.9,
  captionPad: 5,
  /** Half the width of the word "heute" at 11.5 px bold, with a little air. */
  todayHalf: 18,
  shortestMonth: 28,
  /** Month ticks closer together than this run into each other and are left out. */
  finestMonth: 6,
  narrowest: 2,
} as const;

/** The Notensystem where the full name does not fit under its run. */
const shortSystemText = {
  punkte: '0–15 P.',
  sechser: '1–6',
} as const satisfies Record<Notensystem, string>;

type Span = { readonly from: string; readonly to: string };

const schoolYearSpan = (schoolYear: string): Span => ({
  from: halbjahrDateRange(schoolYear, 1).startsOn,
  to: halbjahrDateRange(schoolYear, 2).endsOn,
});

/** ISO dates sort as text. */
const earliest = (dates: ReadonlyArray<string>): string =>
  dates.reduce((a, b) => (a.localeCompare(b) <= 0 ? a : b));

const latest = (dates: ReadonlyArray<string>): string =>
  dates.reduce((a, b) => (a.localeCompare(b) >= 0 ? a : b));

/**
 * The line runs over whole school years, so a Halbjahr that is still missing
 * shows as an empty stretch. The school year that holds today joins the line
 * when it lies right beside it: after the summer nothing covers today yet,
 * and that is what the figure should show.
 */
const domainOf = (stretches: ReadonlyArray<Stretch>, today: string): Span => {
  const spans = stretches.flatMap((stretch) => [
    { from: stretch.startsOn, to: stretch.endsOn },
    schoolYearSpan(stretch.schoolYear),
  ]);
  const from = earliest(spans.map((span) => span.from));
  const to = latest(spans.map((span) => span.to));
  const now = schoolYearSpan(schoolYearForDate(today));
  return {
    from: today < from && addDays(now.to, 1) >= from ? now.from : from,
    to: today > to && now.from <= addDays(to, 1) ? now.to : to,
  };
};

const round = (value: number): number => Math.round(value * 10) / 10;

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

/** Where the first moment of an ISO date lies on a line of the given width. */
const scaleOf = (domain: Span, width: number) => {
  const days = daysBetween(domain.from, domain.to) + 1;
  const pitch = (width - 2 * frame.inset) / days;
  return (isoDate: string): number =>
    round(frame.inset + daysBetween(domain.from, isoDate) * pitch);
};

const tickKinds = new Map<string, TimelineTick['kind']>([
  ['08', 'year'],
  ['02', 'half'],
]);

/**
 * One tick at every first of a month, and one where the line ends. Over many
 * school years on a narrow line only the ticks of the Halbjahre remain.
 */
const ticksOf = (
  domain: Span,
  x: (isoDate: string) => number,
): ReadonlyArray<TimelineTick> => {
  const end = addDays(domain.to, 1);
  const most =
    Math.ceil(daysBetween(domain.from, end) / frame.shortestMonth) + 1;
  const ticks = Array.from(
    { length: most },
    (_, index) => `${shiftMonth(monthOf(domain.from), index)}-01`,
  )
    .filter((isoDate) => isoDate >= domain.from && isoDate <= end)
    .map((isoDate) => ({
      kind: tickKinds.get(isoDate.split('-')[1] ?? '') ?? 'month',
      x: x(isoDate),
    }));
  const pitch = (x(end) - x(domain.from)) / Math.max(1, ticks.length - 1);
  return pitch < frame.finestMonth
    ? ticks.filter((tick) => tick.kind !== 'month')
    : ticks;
};

const systemOf = (stretch: Omit<Stretch, 'id'>): Notensystem =>
  notensystemForKlassenstufe(stretch.klassenstufe);

type Look = TimelineSegment['look'];

const segmentOf = (
  stretch: Stretch,
  look: Look,
  x: (isoDate: string) => number,
): TimelineSegment => {
  const from = x(stretch.startsOn);
  const label = formatHalbjahrLabel(stretch);
  return {
    id: stretch.id,
    label,
    look,
    system: systemOf(stretch),
    tip: `${label} · ${formatIsoDate(stretch.startsOn)} bis ${formatIsoDate(stretch.endsOn)} · ${notensystemText(systemOf(stretch))}`,
    width: round(
      Math.max(frame.narrowest, x(addDays(stretch.endsOn, 1)) - from),
    ),
    x: from,
  };
};

/** The candidate's name comes first, then the current Halbjahr's, then the others from the newest back. */
const nameRank = new Map<Look, number>([
  ['candidate', 0],
  ['current', 1],
]);

/**
 * A name stands under the middle of its stretch. Where the stretches are too
 * narrow for every name, the more important ones keep theirs and a name that
 * would touch another is left out; the list under the figure names them all.
 */
const namesOf = (
  segments: ReadonlyArray<TimelineSegment>,
  width: number,
): ReadonlyArray<TimelineName> => {
  const byImportance = [...segments]
    .reverse()
    .sort(
      (a, b) =>
        (nameRank.get(a.look) ?? 2) - (nameRank.get(b.look) ?? 2) || b.x - a.x,
    );
  const placed: Array<TimelineName & { readonly half: number }> = [];
  for (const segment of byImportance) {
    const half = (segment.label.length * frame.nameCharacter) / 2;
    const x = round(clamp(segment.x + segment.width / 2, half, width - half));
    const free = placed.every(
      (other) => Math.abs(other.x - x) >= half + other.half + frame.nameGap,
    );
    if (free) {
      placed.push({ half, id: segment.id, text: segment.label, x });
    }
  }
  return placed.map(({ id, text, x }) => ({ id, text, x }));
};

type Run = {
  readonly segments: Array<TimelineSegment>;
  readonly system: Notensystem;
};

/** Halbjahre that follow each other in the same Notensystem, oldest first. */
const runsOf = (
  segments: ReadonlyArray<TimelineSegment>,
): ReadonlyArray<Run> => {
  const runs: Array<Run> = [];
  for (const segment of segments) {
    const last = runs.at(-1);
    if (last !== undefined && last.system === segment.system) {
      last.segments.push(segment);
    } else {
      runs.push({ segments: [segment], system: segment.system });
    }
  }
  return runs;
};

const bracketOf = (run: Run): TimelineBracket => {
  const [first] = run.segments;
  const last = run.segments.at(-1);
  const from = first?.x ?? 0;
  const to = round((last?.x ?? 0) + (last?.width ?? 0));
  const text = [notensystemText(run.system), shortSystemText[run.system]].find(
    (candidate) =>
      candidate.length * frame.captionCharacter + 2 * frame.captionPad <=
      to - from,
  );
  return {
    caption:
      text === undefined
        ? null
        : {
            text,
            width: round(
              text.length * frame.captionCharacter + 2 * frame.captionPad,
            ),
          },
    from,
    key: first?.id ?? run.system,
    to,
  };
};

const monthYear = (isoDate: string): string => {
  const [year, month] = isoDate.split('-');
  return `${monthNames[Number(month) - 1] ?? ''} ${year ?? ''}`;
};

const summaryOf = (
  domain: Span,
  segments: ReadonlyArray<TimelineSegment>,
): string => {
  const runs = runsOf(segments)
    .map(
      (run) =>
        `${run.segments.map((segment) => segment.label).join(', ')}: ${notensystemText(run.system)}.`,
    )
    .join(' ');
  const current = segments.find((segment) => segment.look === 'current');
  const candidate = segments.find((segment) => segment.look === 'candidate');
  return [
    `Zeitleiste der Halbjahre von ${monthYear(domain.from)} bis ${monthYear(domain.to)}.`,
    runs,
    current === undefined ? '' : `Aktuell ist ${current.label}.`,
    candidate === undefined
      ? ''
      : `Gestrichelt: ${candidate.label}, wie es im Formular steht.`,
  ]
    .filter((sentence) => sentence !== '')
    .join(' ');
};

/**
 * Lays the Halbjahre out on a line of the given width. `null` when there is
 * nothing to draw: no Halbjahr and no candidate.
 */
export const timeline = ({
  candidate,
  halbjahre,
  today,
  width,
}: {
  readonly candidate: TimelineCandidate | null;
  readonly halbjahre: ReadonlyArray<Stretch>;
  /** ISO date. */
  readonly today: string;
  readonly width: number;
}): Timeline | null => {
  const looks = halbjahrLooks(halbjahre, today);
  const kept = halbjahre.filter(
    (halbjahr) => halbjahr.id !== candidate?.replaces,
  );
  const held: ReadonlyArray<Stretch> =
    candidate === null ? [] : [{ ...candidate, id: candidateId }];
  const stretches = [...kept, ...held].sort((a, b) =>
    a.startsOn.localeCompare(b.startsOn),
  );
  if (stretches.length === 0) {
    return null;
  }
  const domain = domainOf(stretches, today);
  const x = scaleOf(domain, width);
  const segments = stretches.map((stretch) =>
    segmentOf(
      stretch,
      stretch.id === candidateId
        ? 'candidate'
        : (looks.get(stretch.id) ?? 'future'),
      x,
    ),
  );
  const todayX = x(today);
  return {
    brackets: runsOf(segments).map(bracketOf),
    names: namesOf(segments, width),
    segments,
    summary: summaryOf(domain, segments),
    ticks: ticksOf(domain, x),
    today:
      today >= domain.from && today <= domain.to
        ? {
            labelX: clamp(todayX, frame.todayHalf, width - frame.todayHalf),
            x: todayX,
          }
        : null,
    width,
  };
};
