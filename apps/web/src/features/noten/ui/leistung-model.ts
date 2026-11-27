import {
  formatDayMonth,
  formatLongDate,
  relativeDateText,
} from '#/shared/date/date-text.ts';
import { anteilText } from '#/shared/noten/anteil-text.ts';
import {
  evaluateFach,
  leistungsanteile,
} from '#/shared/noten/fach-aggregation.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import type {
  Fachgewichtung,
  Leistungsart,
  Notensystem,
} from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { Leistung } from '../services/noten-service.ts';
import { leistungState } from './fach-ruler.ts';
import { gewichtText } from './note-entry-model.ts';

/**
 * The page of one Leistung, without the screen: where the Leistung lies
 * against the Fachschnitt, what it does to it and how much it counts. Every
 * figure comes from the functions that compute the Fachschnitt itself.
 */

/** A Leistungsart as the subject of a sentence, and how it is referred back to. */
type Wording = {
  readonly subject: string;
  /** How its own piece of a figure is labelled on its page. */
  readonly own: string;
  readonly pronoun: string;
  readonly without: string;
};

const feminine = { pronoun: 'sie', without: 'Ohne sie' } as const;

const wording: Readonly<Record<Leistungsart, Wording>> = {
  klausur: { subject: 'Die Klausur', own: 'Diese Klausur', ...feminine },
  gfs: { subject: 'Die GFS', own: 'Diese GFS', ...feminine },
  test: {
    subject: 'Der Test',
    own: 'Dieser Test',
    pronoun: 'er',
    without: 'Ohne ihn',
  },
  muendlich: {
    subject: 'Die mündliche Note',
    own: 'Diese mündliche Note',
    ...feminine,
  },
  sonstige: {
    subject: 'Die sonstige Note',
    own: 'Diese sonstige Note',
    ...feminine,
  },
};

const capitalized = (word: string): string =>
  `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

/** "Klausur" and, if there is one, its Notiz: the two parts of the page's heading. */
export const titleOf = (
  leistung: Leistung,
): { readonly art: string; readonly notiz: string | null } => ({
  art: leistungsartLabel[leistung.kind],
  notiz: leistung.notiz,
});

/** "Physik · J1.1 · Montag, 16. November 2026 · vor 10 Tagen" */
export const leadOf = ({
  halbjahrLabel,
  leistung,
  today,
}: {
  readonly halbjahrLabel: string;
  readonly leistung: Leistung;
  readonly today: string;
}): string =>
  [
    leistung.fachName,
    halbjahrLabel,
    formatLongDate(leistung.datum),
    relativeDateText(today, leistung.datum),
  ].join(' · ');

/** "Klausur · 16.11. · Physik": what the browser's tab calls the page. */
export const tabNameOf = (
  leistung: Pick<Leistung, 'kind' | 'datum' | 'fachName'>,
): string =>
  [
    leistungsartLabel[leistung.kind],
    formatDayMonth(leistung.datum),
    leistung.fachName,
  ].join(' · ');

/** "Klausur vom 16.11. löschen?" */
export const deleteQuestion = (leistung: Leistung): string =>
  `${leistungsartLabel[leistung.kind]} vom ${formatDayMonth(leistung.datum)} löschen?`;

/** Whether a server answer says the Leistung does not exist, as opposed to not having been reached. */
export const isNotFound = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  '_tag' in error &&
  error._tag === 'NoteNichtGefunden';

type FachInput = {
  readonly gewichtung: Fachgewichtung;
  /** The Leistungen of the Fach in the Halbjahr, with the one the page is about. */
  readonly leistungen: ReadonlyArray<Leistung>;
};

const fachschnitt = (
  leistungen: ReadonlyArray<Leistung>,
  gewichtung: Fachgewichtung,
): number | null =>
  evaluateFach(
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
  ).average;

/** In `punkte` more is better, in `sechser` less. */
const isBetter = (a: number, b: number, system: Notensystem): boolean =>
  system === 'punkte' ? a > b : a < b;

/** `better` lies to the right on the bar of either Notensystem, `worse` to the left. */
type Side = 'better' | 'worse';

/** How a Leistung stands against the Fachschnitt. */
export type Standing =
  /** It has no Note yet. `missing`: its date has passed. */
  | { readonly kind: 'waiting'; readonly state: 'pending' | 'missing' }
  /** It is the only Note of the Fach, so it is the Fachschnitt. */
  | { readonly kind: 'alone' }
  | {
      readonly kind: 'placed';
      /** How far the Note lies from the Fachschnitt, as a positive figure. */
      readonly distance: number;
      /** On which side of the Fachschnitt it lies; `null` when it lies on it. */
      readonly side: Side | null;
      /** The Fachschnitt as it would be without this Leistung. */
      readonly without: number;
      /** Which way the Leistung moves the Fachschnitt; `null` when the rounded figure stays. */
      readonly effect: Side | null;
    };

/** Closer than this, a Note and the Fachschnitt read as the same figure. */
const sameFigure = 0.005;

export const standingOf = ({
  gewichtung,
  leistung,
  leistungen,
  system,
  today,
}: FachInput & {
  readonly leistung: Leistung;
  readonly system: Notensystem;
  readonly today: string;
}): Standing => {
  if (leistung.status !== 'graded') {
    return {
      kind: 'waiting',
      state:
        leistungState(leistung, today) === 'missing' ? 'missing' : 'pending',
    };
  }
  const others = leistungen.filter((other) => other.id !== leistung.id);
  const average = fachschnitt([...others, leistung], gewichtung);
  const without = fachschnitt(others, gewichtung);
  if (average === null || without === null) {
    return { kind: 'alone' };
  }
  const distance = Math.abs(leistung.wert - average);
  const side = (a: number, b: number): Side =>
    isBetter(a, b, system) ? 'better' : 'worse';
  return {
    kind: 'placed',
    distance,
    side: distance < sameFigure ? null : side(leistung.wert, average),
    without,
    effect:
      formatNote(average, system) === formatNote(without, system)
        ? null
        : side(average, without),
  };
};

/** "1,5 P. unter dem Fachschnitt", and where less is better "0,5 schlechter als der Fachschnitt". */
const distanceText = (
  distance: number,
  side: Side,
  system: Notensystem,
): string => {
  const figure = formatNote(distance, system);
  if (system === 'punkte') {
    return `${figure} ${side === 'worse' ? 'unter' : 'über'} dem Fachschnitt`;
  }
  return `${figure} ${side === 'worse' ? 'schlechter' : 'besser'} als der Fachschnitt`;
};

/** What stands on the dimension line between the disc and the fulcrum; `null` where there is no distance to measure. */
export const dimensionText = (
  standing: Standing,
  system: Notensystem,
): string | null =>
  standing.kind === 'placed' && standing.side !== null
    ? distanceText(standing.distance, standing.side, system)
    : null;

/** A figure that ends in "P." ends the sentence itself. */
const sentenceEnd = (text: string): string =>
  text.endsWith('.') ? text : `${text}.`;

const direction: Readonly<Record<Side, string>> = {
  better: 'rechts',
  worse: 'links',
};

type SentenceInput = {
  readonly fachName: string;
  readonly kind: Leistungsart;
  readonly standing: Standing;
  readonly system: Notensystem;
};

const placedSentence = (
  standing: Extract<Standing, { readonly kind: 'placed' }>,
  { fachName, kind, system }: SentenceInput,
): string => {
  const { subject, without } = wording[kind];
  const { distance, effect, side } = standing;
  const otherwise = sentenceEnd(
    `${without} stünde ${fachName} bei ${formatNote(standing.without, system)}`,
  );
  if (side === null) {
    const lies = `${subject} liegt genau auf dem Fachschnitt`;
    return effect === null
      ? `${lies} und verschiebt ihn nicht.`
      : `${lies}. ${otherwise}`;
  }
  const verb = system === 'punkte' ? 'liegt' : 'ist um';
  const lies = `${subject} ${verb} ${distanceText(distance, side, system)}`;
  if (effect === null) {
    return `${lies}, verschiebt ihn aber kaum.`;
  }
  // A Leistung can lie on one side of the Fachschnitt and still move it to the other: without it, what is left of its Wertungsbereich counts for more.
  const pulls = effect === side ? 'zieht ihn' : 'zieht ihn trotzdem';
  return `${lies} und ${pulls} nach ${direction[effect]}: ${otherwise}`;
};

/**
 * What the Leistung does to the Fachschnitt, in one or two sentences:
 * "Die Klausur liegt 1,5 P. unter dem Fachschnitt und zieht ihn nach links:
 * Ohne sie stünde Physik bei 11,2 P."
 */
export const standingSentence = (input: SentenceInput): string => {
  const { fachName, kind, standing } = input;
  const { pronoun, subject } = wording[kind];
  if (standing.kind === 'placed') {
    return placedSentence(standing, input);
  }
  if (standing.kind === 'alone') {
    return `${subject} ist bisher die einzige Note in ${fachName} und bestimmt den Fachschnitt allein.`;
  }
  return standing.state === 'missing'
    ? `${subject} ist vorbei, aber die Note fehlt noch. Bis sie eingetragen ist, zählt ${pronoun} nicht.`
    : `${subject} ist noch nicht gelandet. ${capitalized(pronoun)} wartet am rechten Rand der Skala und zählt erst, wenn die Note da ist.`;
};

/** What each Leistung of the Fach counts. */
export type FachShares = {
  /** Among the Noten there are; a Leistung without a Note has no share. */
  readonly now: ReadonlyMap<string, number>;
  /** Once every Leistung of the Fach has a Note. */
  readonly later: ReadonlyMap<string, number>;
};

const weighted = (leistung: Leistung) => ({
  id: leistung.id,
  individualGewichtung: leistung.gewicht,
  leistungsart: leistung.kind,
});

export const fachShares = ({
  gewichtung,
  leistungen,
}: FachInput): FachShares => ({
  now: leistungsanteile(
    leistungen.filter((leistung) => leistung.status === 'graded').map(weighted),
    gewichtung,
  ),
  later: leistungsanteile(leistungen.map(weighted), gewichtung),
});

/** "So viel zählt sie", "So viel zählt er". */
export const shareHeading = (kind: Leistungsart): string =>
  `So viel zählt ${wording[kind].pronoun}`;

/** "Diese Klausur", "Dieser Test": what the piece of the Leistung itself is called in the bar of shares. */
export const shareLabel = (kind: Leistungsart): string => wording[kind].own;

/**
 * "Die Klausur zählt heute 40 % des Fachschnitts. Sind auch die ausstehenden
 * Leistungen benotet, sind es 33 %.", and for a Leistung without a Note
 * "Benotet zählt sie 33 % des Fachschnitts."
 */
export const shareSentence = ({
  leistung,
  leistungen,
  shares,
}: {
  readonly leistung: Leistung;
  readonly leistungen: ReadonlyArray<Leistung>;
  readonly shares: FachShares;
}): string => {
  const { pronoun, subject } = wording[leistung.kind];
  const later = anteilText(shares.later.get(leistung.id) ?? 0);
  const weight =
    leistung.gewicht === 1
      ? ''
      : ` ${capitalized(pronoun)} ist ${gewichtText(leistung.gewicht)} gewichtet.`;
  if (leistung.status !== 'graded') {
    return `Benotet zählt ${pronoun} ${later} des Fachschnitts.${weight}`;
  }
  const now = anteilText(shares.now.get(leistung.id) ?? 0);
  const othersWait = leistungen.some(
    (other) => other.id !== leistung.id && other.status !== 'graded',
  );
  const then =
    othersWait && now !== later
      ? ` Sind auch die ausstehenden Leistungen benotet, sind es ${later}.`
      : '';
  return `${subject} zählt heute ${now} des Fachschnitts.${then}${weight}`;
};

/** One Leistung's piece of the Fachschnitt. */
export type SharePart = {
  readonly id: string;
  /** 0 to 1. */
  readonly share: number;
  /** The Leistung the page is about. */
  readonly mine: boolean;
  /** It has no Note yet; its share is what it will count. */
  readonly open: boolean;
  /** "Klausur · 02.11. · 50 %" */
  readonly tip: string;
};

/**
 * The Fachschnitt cut into the shares of its Leistungen, in the order of
 * their dates. For a Leistung with a Note these are the shares of today,
 * among the Noten there are; for one without, the shares once every Leistung
 * has its Note.
 */
export const shareParts = ({
  leistung,
  leistungen,
  shares,
}: {
  readonly leistung: Leistung;
  readonly leistungen: ReadonlyArray<Leistung>;
  readonly shares: FachShares;
}): ReadonlyArray<SharePart> => {
  const counted = leistung.status === 'graded' ? shares.now : shares.later;
  return leistungen
    .flatMap((entry) => {
      const share = counted.get(entry.id) ?? 0;
      return share > 0
        ? [
            {
              id: entry.id,
              share,
              mine: entry.id === leistung.id,
              open: entry.status !== 'graded',
              datum: entry.datum,
              tip: `${leistungsartLabel[entry.kind]} · ${formatDayMonth(entry.datum)} · ${anteilText(share)}`,
            },
          ]
        : [];
    })
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map(({ datum: _datum, ...part }) => part);
};
