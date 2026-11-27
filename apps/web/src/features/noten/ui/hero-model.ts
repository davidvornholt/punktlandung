import { formatIsoDate } from '#/shared/date/calendar-date.ts';
import { monthNames, nbsp } from '#/shared/date/date-text.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import { notenCountText } from '#/shared/noten/noten-count-text.ts';
import { bereichDerLeistungsart } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import {
  formatHalbjahrLabel,
  klassenstufeText,
} from '#/shared/school/klassenstufe.ts';
import {
  type HalbjahrPlace,
  halbjahrPlaces,
  type Stratum,
} from '#/shared/ui/halbjahr-strata.ts';
import type { TrendEntry } from '../services/trend-calculation.ts';

/**
 * What the hero of the Übersicht says about its Noten: which colour a dot
 * has, what its tooltip and the legend say, and the words beside the figure
 * for today and for any day the Verlauf is turned back to.
 */

export type HeroHalbjahr = {
  readonly id: string;
  /** "J1.1" */
  readonly label: string;
  /** ISO date. */
  readonly startsOn: string;
};

/**
 * How far back a Note's Halbjahr lies: `now` is the current one, the digits
 * are the strata of the older ones. The values of `data-stratum`, which
 * overview.css colours a dot by.
 */
export type HeroStratum = 'now' | `${Stratum}`;

export type HeroDotInfo = {
  readonly id: string;
  readonly fachId: string;
  readonly stratum: HeroStratum;
  /** A mündliche Note of the current Halbjahr is a ring, as on every other ruler. */
  readonly ring: boolean;
  readonly tip: string;
};

export type HeroLegendItem = {
  readonly key: string;
  readonly stratum: HeroStratum;
  readonly ring: boolean;
  readonly label: string;
};

const heroStratum = (place: HalbjahrPlace): HeroStratum =>
  typeof place === 'number' ? `${place}` : 'now';

const byStart = (left: HeroHalbjahr, right: HeroHalbjahr): number =>
  left.startsOn.localeCompare(right.startsOn);

/**
 * The stratum of every Halbjahr, by its id. Without a current Halbjahr the
 * newest one counts as current. The bar carries only Noten that were given,
 * so a Halbjahr that has not begun needs no colour of its own.
 */
const strataOf = (
  halbjahre: ReadonlyArray<HeroHalbjahr>,
  currentId: string | null,
): ReadonlyMap<string, HeroStratum> => {
  const known = halbjahre.some((halbjahr) => halbjahr.id === currentId);
  const newest = [...halbjahre].sort(byStart).at(-1);
  const places = halbjahrPlaces(
    halbjahre,
    known ? currentId : (newest?.id ?? null),
  );
  return new Map([...places].map(([id, place]) => [id, heroStratum(place)]));
};

/** Ends a sentence, unless it already ends with the full stop of "P.". */
const sentence = (text: string): string =>
  text.endsWith('.') ? text : `${text}.`;

/** "11 P.", and for a Note of the Sechsersystem "Note 2,5". */
const noteText = (entry: TrendEntry): string =>
  entry.notensystem === 'punkte'
    ? formatNote(entry.notenwert, 'punkte')
    : `Note ${formatNote(entry.notenwert, 'sechser')}`;

/** "Deutsch · Klausur · 12.10.2026 · 11 P."; a Note 1 to 6 also says where it lies on the bar. */
const tipOf = (entry: TrendEntry): string => {
  const head = `${entry.fachName} · ${leistungsartLabel[entry.leistungsart]} · ${formatIsoDate(entry.datum)}`;
  return entry.notensystem === 'punkte'
    ? `${head} · ${noteText(entry)}`
    : `${head} · ${noteText(entry)} (${formatNote(entry.punkte, 'punkte')})`;
};

export const heroDots = (
  entries: ReadonlyArray<TrendEntry>,
  halbjahre: ReadonlyArray<HeroHalbjahr>,
  currentId: string | null,
): ReadonlyArray<HeroDotInfo> => {
  const strata = strataOf(halbjahre, currentId);
  return entries.map((entry) => {
    const stratum = strata.get(entry.halbjahrId) ?? '0';
    return {
      id: entry.id,
      fachId: entry.fachId,
      stratum,
      ring:
        stratum === 'now' &&
        bereichDerLeistungsart[entry.leistungsart] === 'muendlich',
      tip: tipOf(entry),
    };
  });
};

/**
 * One item per colour that occurs, oldest first. A colour that stands for
 * several Halbjahre is named by where it ends or begins: "bis 9.1".
 */
export const heroLegend = (
  entries: ReadonlyArray<TrendEntry>,
  halbjahre: ReadonlyArray<HeroHalbjahr>,
  currentId: string | null,
): ReadonlyArray<HeroLegendItem> => {
  const strata = strataOf(halbjahre, currentId);
  const used = new Set(entries.map((entry) => entry.halbjahrId));
  const labels = new Map<HeroStratum, Array<string>>();
  for (const halbjahr of [...halbjahre].sort(byStart)) {
    const stratum = strata.get(halbjahr.id) ?? '0';
    if (used.has(halbjahr.id)) {
      labels.set(stratum, [...(labels.get(stratum) ?? []), halbjahr.label]);
    }
  }
  const items = [...labels].map(([stratum, names]): HeroLegendItem => {
    const [first] = names;
    const last = names.at(-1) ?? '';
    const several = names.length > 1;
    const older = several ? `bis ${last}` : last;
    return {
      key: stratum,
      stratum,
      ring: false,
      label: stratum === 'now' && several ? `ab ${first}` : older,
    };
  });
  const now = items.find((item) => item.stratum === 'now');
  const rings = heroDots(entries, halbjahre, currentId).some((dot) => dot.ring);
  return now !== undefined && rings
    ? [...items, { key: 'ring', stratum: 'now', ring: true, label: 'mündlich' }]
    : items;
};

export type HeroCaption = {
  readonly title: string;
  readonly text: string;
  /**
   * The Note that landed last, for a day the Verlauf is turned back to. It is
   * a sentence of its own, so it can be left out while the Noten land one
   * after the other: there it would change faster than it can be read.
   */
  readonly landed: string | null;
};

/**
 * The words beside the figure. `count` is how many Noten lie on the bar: all
 * of them today, fewer while the Verlauf is turned back.
 */
export const heroCaption = (
  entries: ReadonlyArray<TrendEntry>,
  count: number,
): HeroCaption => {
  const [first] = entries;
  const last = entries[count - 1];
  if (first === undefined || last === undefined) {
    return {
      title: 'Vor der ersten Note',
      text: 'Die Skala ist leer.',
      landed: null,
    };
  }
  if (count >= entries.length) {
    const all =
      entries.length === 1
        ? 'Bisher eine Note.'
        : `Alle ${entries.length} Noten seit ${klassenstufeText(first.klassenstufe)}.`;
    return {
      title: 'Gesamtschnitt',
      text: `${all} Jedes Fach zählt in jedem Schuljahr gleich viel: Je weniger Noten es dort hat, desto schwerer wiegt jede.`,
      landed: null,
    };
  }
  return {
    title: `Stand am ${formatIsoDate(last.datum)}`,
    text: `Nach ${count === 1 ? 'einer Note' : `${count}${nbsp}Noten`}, in ${formatHalbjahrLabel(last)}.`,
    // A Note stays on one line with its unit: no line ends on "11" or begins with "P.".
    landed: sentence(
      `Zuletzt gelandet: ${last.fachName}, ${leistungsartLabel[last.leistungsart]}, ${noteText(last).replaceAll(' ', nbsp)}`,
    ),
  };
};

const schnittText = (entry: TrendEntry): string =>
  entry.schnitt === null
    ? 'noch kein Gesamtschnitt'
    : `Gesamtschnitt ${formatNote(entry.schnitt, 'punkte')}`;

/** What the slider of the Verlauf says for a position: the day, the count and the Schnitt. */
export const heroValueText = (
  entries: ReadonlyArray<TrendEntry>,
  count: number,
): string => {
  const last = entries[count - 1];
  if (last === undefined) {
    return 'Vor der ersten Note';
  }
  const when = count >= entries.length ? 'Heute' : formatIsoDate(last.datum);
  return sentence(
    `${sentence(`${when}: ${notenCountText(count)}, ${schnittText(last)}`)} Zuletzt: ${last.fachName}, ${leistungsartLabel[last.leistungsart]}, ${noteText(last)}`,
  );
};

/** The name of the figure for screen readers. */
export const heroFigureLabel = (
  entries: ReadonlyArray<TrendEntry>,
  count: number,
): string => {
  const last = entries[count - 1];
  if (last === undefined) {
    return 'Die Skala von 0 bis 15 Notenpunkten, noch ohne Noten.';
  }
  const scale = 'als Punkte auf der Skala von 0 bis 15 Notenpunkten';
  const live = count >= entries.length;
  const all = count === 1 ? 'Eine Note' : `Alle ${count} Noten`;
  const shown = live
    ? `${all} ${scale}.`
    : `Stand am ${formatIsoDate(last.datum)}: ${notenCountText(count)} ${scale}.`;
  return last.schnitt === null
    ? shown
    : sentence(
        `${shown} Der Gesamtschnitt ${live ? 'liegt' : 'lag'} bei ${formatNote(last.schnitt, 'punkte')}`,
      );
};

const monthLength = 2;
const yearLength = 4;
const monthFrom = 5;

/** "Oktober 2024" for the month of an ISO date. */
export const monthText = (isoDate: string): string => {
  const month = Number(isoDate.slice(monthFrom, monthFrom + monthLength));
  return `${monthNames[month - 1] ?? ''} ${isoDate.slice(0, yearLength)}`;
};
