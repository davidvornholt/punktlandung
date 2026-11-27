import {
  formatWeekdayDate,
  nbsp,
  relativeDateText,
} from '#/shared/date/date-text.ts';
import { anteilText } from '#/shared/noten/anteil-text.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import {
  bereichDerLeistungsart,
  type Notensystem,
} from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { Flag } from '#/shared/ui/flag.tsx';
import { DiscGlyph } from '#/shared/ui/ruler/disc.tsx';
import type { DiscState } from '#/shared/ui/ruler/geometry.ts';
import type { Leistung } from '../services/noten-service.ts';
import { gewichtText } from './note-entry-model.ts';
import { DotLine } from './noten-dot-line.tsx';
import type { LeistungLinkComponent } from './noten-links.tsx';

/** How a Leistung lies on the bench of its Fach. */
export type RowStanding = {
  /** The share of the Fachschnitt the Leistung carries, or will carry once it has a Note. */
  readonly share: number;
  readonly state: DiscState;
};

/** "Mo 16.11." and "zählt 40 %", and for a Leistung without a Note when it is due and what it will count. */
const whenParts = (
  leistung: Leistung,
  standing: RowStanding,
  today: string,
): ReadonlyArray<string> => [
  formatWeekdayDate(leistung.datum),
  ...(standing.state === 'pending'
    ? [relativeDateText(today, leistung.datum)]
    : []),
  // Kept in one piece, so the figure is never alone on a line.
  `zählt${nbsp}${anteilText(standing.share)}`,
  ...(leistung.gewicht === 1 ? [] : [gewichtText(leistung.gewicht)]),
];

/** The Note at the end of the row, or what stands in for it. */
const RowValue = ({
  leistung,
  state,
  system,
}: {
  readonly leistung: Leistung;
  readonly state: DiscState;
  readonly system: Notensystem;
}) => {
  if (leistung.status === 'graded') {
    const [figure, unit] = formatNote(leistung.wert, system).split(' ');
    return (
      <span className="whitespace-nowrap text-[0.90625rem]">
        <b className="text-[1.375rem] leading-none" data-row-value="">
          {figure}
        </b>
        {unit === undefined ? null : ` ${unit}`}
      </span>
    );
  }
  return state === 'missing' ? (
    <span className="desk:inline hidden text-sm">
      <Flag>Note fehlt noch</Flag>
    </span>
  ) : (
    // On a phone the dashed disc and the days left say it already.
    <span className="desk:inline hidden text-[0.90625rem] text-ink-soft">
      ausstehend
    </span>
  );
};

/**
 * The readable part of a row, as one link to the page of the Leistung. The
 * Noten page and the page of a Leistung both list Leistungen with it, so a
 * Leistung looks the same wherever it is listed.
 */
export const RowSummary = ({
  leistung,
  link: LinkTo,
  onHighlight,
  standing,
  system,
  today,
}: {
  readonly leistung: Leistung;
  readonly link: LeistungLinkComponent;
  readonly onHighlight: (id: string | null) => void;
  readonly standing: RowStanding;
  readonly system: Notensystem;
  /** ISO date. */
  readonly today: string;
}) => (
  <LinkTo
    className="group grid min-h-[3.625rem] grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2 pr-2.5 pl-1"
    id={leistung.id}
    onBlur={() => onHighlight(null)}
    onFocus={() => onHighlight(leistung.id)}
  >
    <DiscGlyph
      kind={bereichDerLeistungsart[leistung.kind]}
      share={standing.share}
      state={standing.state}
    />
    <span className="min-w-0">
      <span className="wrap-break-word block hyphens-auto leading-[1.3]">
        <b className="decoration-[1.5px] underline-offset-[3px] group-hover:underline">
          {leistungsartLabel[leistung.kind]}
        </b>
        {leistung.notiz === null ? null : ` · ${leistung.notiz}`}
      </span>
      <span className="block text-[0.8125rem] text-ink-soft">
        <DotLine parts={whenParts(leistung, standing, today)} />
      </span>
      {standing.state === 'missing' ? (
        <span className="mt-1 block desk:hidden text-sm">
          <Flag>Note fehlt noch</Flag>
        </span>
      ) : null}
    </span>
    <RowValue leistung={leistung} state={standing.state} system={system} />
  </LinkTo>
);
