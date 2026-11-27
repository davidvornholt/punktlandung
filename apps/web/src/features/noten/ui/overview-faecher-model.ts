import { notenCountText } from '#/shared/noten/noten-count-text.ts';
import type { Fachgewichtung, Notensystem } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { Leistung } from '../services/noten-service.ts';
import { type FachRuler, fachRuler } from './fach-ruler.ts';

/**
 * The rows of "Fächer in J1.1" on the Übersicht: every Fach of the Schuljahr
 * with the ruler of its Leistungen in the Halbjahr.
 */

/** What the Übersicht needs of a Fach. */
export type OverviewFach = {
  readonly id: string;
  readonly name: string;
  readonly gewichtung: Fachgewichtung;
};

export type FachRow = {
  readonly id: string;
  readonly name: string;
  readonly ruler: FachRuler;
  /** The Fachschnitt split into its figure and its unit: ["10,8", "P."]; `null` without a Note. */
  readonly schnitt: {
    readonly figure: string;
    /**
     * What the longest fraction among the rows has more than this figure:
     * "3" for "10,8" beside "12,33", ",33" for "12". Set invisibly after the
     * figure, it lines the column up on the decimal comma.
     */
    readonly fill: string;
    readonly unit: string | null;
  } | null;
  /**
   * What the row does not print, for screen readers: "aus 2 Noten, 1
   * ausstehend" after a Fachschnitt, "noch keine Note" without one.
   */
  readonly detail: string;
};

/** The fraction of a figure with its comma: ",8" of "10,8", nothing of "12". */
const fractionOf = (figure: string): string => {
  const comma = figure.indexOf(',');
  return comma === -1 ? '' : figure.slice(comma);
};

const detailOf = (leistungen: ReadonlyArray<Leistung>): string => {
  const graded = leistungen.filter(
    (leistung) => leistung.status === 'graded',
  ).length;
  const waiting = leistungen.length - graded;
  const head =
    graded === 0 ? 'noch keine Note' : `aus ${notenCountText(graded)}`;
  return waiting === 0 ? head : `${head}, ${waiting} ausstehend`;
};

/**
 * One row per Fach, in the order of the Fächer. A Fach that only occurs in
 * the Leistungen, because it has been archived since, follows at the end.
 */
export const fachRows = ({
  faecher,
  leistungen,
  system,
  today,
}: {
  readonly faecher: ReadonlyArray<OverviewFach>;
  /** The Leistungen of the Halbjahr. */
  readonly leistungen: ReadonlyArray<Leistung>;
  readonly system: Notensystem;
  /** ISO date. */
  readonly today: string;
}): ReadonlyArray<FachRow> => {
  const listed = new Set(faecher.map((fach) => fach.id));
  const others = new Map<string, OverviewFach>();
  for (const leistung of leistungen) {
    if (!(listed.has(leistung.fachId) || others.has(leistung.fachId))) {
      others.set(leistung.fachId, {
        id: leistung.fachId,
        name: leistung.fachName,
        gewichtung: leistung.gewichtung,
      });
    }
  }
  const rows = [...faecher, ...others.values()].map((fach) => {
    const own = leistungen.filter((leistung) => leistung.fachId === fach.id);
    // A Leistung carries the Gewichtung its Schuljahr counts it with.
    const ruler = fachRuler({
      gewichtung: own[0]?.gewichtung ?? fach.gewichtung,
      leistungen: own,
      system,
      today,
    });
    const { average } = ruler.evaluation;
    const text = average === null ? null : formatNote(average, system);
    const [figure = '', unit = null] = text?.split(' ') ?? [];
    return {
      id: fach.id,
      name: fach.name,
      ruler,
      schnitt: text === null ? null : { figure, unit },
      detail: detailOf(own),
    };
  });
  const longest = rows
    .map((row) => fractionOf(row.schnitt?.figure ?? ''))
    .reduce((left, right) => (right.length > left.length ? right : left), '');
  return rows.map((row) => ({
    ...row,
    schnitt:
      row.schnitt === null
        ? null
        : {
            ...row.schnitt,
            fill: longest.slice(fractionOf(row.schnitt.figure).length),
          },
  }));
};
