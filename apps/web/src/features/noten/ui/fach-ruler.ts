import { formatIsoDate } from '#/shared/date/calendar-date.ts';
import { formatDayMonth, relativeDateText } from '#/shared/date/date-text.ts';
import { anteilText } from '#/shared/noten/anteil-text.ts';
import {
  evaluateFach,
  type FachEvaluation,
  leistungsanteile,
} from '#/shared/noten/fach-aggregation.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import {
  bereichDerLeistungsart,
  type Fachgewichtung,
  type Notensystem,
} from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type {
  DiscState,
  RulerModel,
  RulerPoint,
} from '#/shared/ui/ruler/geometry.ts';
import type { Leistung } from '../services/noten-service.ts';

/**
 * The Leistungen of one Fach in one Halbjahr as discs on a ruler. A disc's
 * mass is the share of the Fachschnitt its Leistung carries, so the fulcrum
 * under the discs is the Fachschnitt, not a drawing of it.
 */

export type FachRuler = {
  readonly model: RulerModel;
  readonly evaluation: FachEvaluation;
  /**
   * The share of the Fachschnitt per Leistung id (0 to 1). For a Leistung
   * with a Note it is what the Note counts now, among the Noten there are.
   * For one without it is what its Note will count once every Leistung of
   * the Fach has one.
   */
  readonly shares: ReadonlyMap<string, number>;
};

/** `missing`: the date has passed and the Note has not been entered. */
export const leistungState = (leistung: Leistung, today: string): DiscState => {
  if (leistung.status === 'graded') {
    return 'graded';
  }
  return leistung.datum < today ? 'missing' : 'pending';
};

const weighted = (leistung: Leistung) => ({
  id: leistung.id,
  individualGewichtung: leistung.gewicht,
  leistungsart: leistung.kind,
});

/** What each Leistung of a Fach counts; see `FachRuler.shares`. */
export const leistungShares = (
  leistungen: ReadonlyArray<Leistung>,
  gewichtung: Fachgewichtung,
): ReadonlyMap<string, number> => {
  const graded = leistungen.filter((leistung) => leistung.status === 'graded');
  const now = leistungsanteile(graded.map(weighted), gewichtung);
  const later = leistungsanteile(leistungen.map(weighted), gewichtung);
  return new Map(
    leistungen.map((leistung) => [
      leistung.id,
      (leistung.status === 'graded' ? now : later).get(leistung.id) ?? 0,
    ]),
  );
};

/** "Klausur · 28.09.", or in two lines "Klausur / in 12 Tagen" for a disc that waits beside the bar. */
const figureNote = (leistung: Leistung, state: DiscState, today: string) => {
  const art = leistungsartLabel[leistung.kind];
  if (state === 'graded') {
    return `${art} · ${formatDayMonth(leistung.datum)}`;
  }
  return state === 'missing'
    ? `${art}\nNote fehlt`
    : `${art}\n${relativeDateText(today, leistung.datum)}`;
};

type Wording = {
  readonly leistung: Leistung;
  readonly share: number;
  readonly state: DiscState;
  readonly system: Notensystem;
};

/** The tooltip: "Klausur · 28.09. · 11 P. · zählt 40 %". */
const tip = ({ leistung, share, state, system }: Wording): string => {
  const head = `${leistungsartLabel[leistung.kind]} · ${formatDayMonth(leistung.datum)}`;
  if (leistung.status === 'graded') {
    return `${head} · ${formatNote(leistung.wert, system)} · zählt ${anteilText(share)}`;
  }
  return `${head} · ${state === 'missing' ? 'Note fehlt noch' : 'ausstehend'} · zählt später ${anteilText(share)}`;
};

/** The name of the disc as a link: "Klausur vom 28.09.2026, 11 P.". */
const label = ({ leistung, state, system }: Wording): string => {
  const head = `${leistungsartLabel[leistung.kind]} vom ${formatIsoDate(leistung.datum)}`;
  if (leistung.status === 'graded') {
    return `${head}, ${formatNote(leistung.wert, system)}`;
  }
  return `${head}, ${state === 'missing' ? 'Note fehlt noch' : 'ausstehend'}`;
};

export const fachRuler = ({
  focusId,
  gewichtung,
  leistungen,
  system,
  today,
}: {
  /** The Leistung a page is about; when it has a Note, the other discs step back. */
  readonly focusId?: string;
  readonly gewichtung: Fachgewichtung;
  /** The Leistungen of one Fach in one Halbjahr. */
  readonly leistungen: ReadonlyArray<Leistung>;
  readonly system: Notensystem;
  /** ISO date. */
  readonly today: string;
}): FachRuler => {
  const shares = leistungShares(leistungen, gewichtung);
  const evaluation = evaluateFach(
    leistungen.flatMap((leistung) =>
      leistung.status === 'graded'
        ? [
            {
              notenwert: leistung.wert,
              individualGewichtung: leistung.gewicht,
              leistungsart: leistung.kind,
            },
          ]
        : [],
    ),
    gewichtung,
  );
  // The others step back only behind a disc that lies on the bar with them. A
  // Leistung without a Note waits beside the bar and hides nothing.
  const focusLanded = leistungen.some(
    (leistung) => leistung.id === focusId && leistung.status === 'graded',
  );
  const points = leistungen.map((leistung): RulerPoint => {
    const state = leistungState(leistung, today);
    const wording = {
      leistung,
      share: shares.get(leistung.id) ?? 0,
      state,
      system,
    };
    return {
      id: leistung.id,
      value: leistung.status === 'graded' ? leistung.wert : null,
      mass: wording.share,
      kind:
        bereichDerLeistungsart[leistung.kind] === 'schriftlich'
          ? 'schriftlich'
          : 'muendlich',
      state,
      date: leistung.datum,
      label: label(wording),
      tip: tip(wording),
      note: figureNote(leistung, state, today),
      ...(focusId === undefined
        ? {}
        : {
            focus: leistung.id === focusId,
            dim: focusLanded && leistung.id !== focusId,
          }),
    };
  });
  return {
    model: { points, fulcrum: evaluation.average, caption: 'Fachschnitt' },
    evaluation,
    shares,
  };
};
