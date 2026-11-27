import { nbsp } from '#/shared/date/date-text.ts';
import { anteilText } from '#/shared/noten/anteil-text.ts';
import {
  bereichDerLeistungsart,
  type Fachgewichtung,
  isPlanbar,
  type Leistungsart,
  type Notensystem,
} from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { RulerCandidate } from '#/shared/ui/ruler/candidate.ts';
import { type NotenFields, notenLimits } from '../schemas/note-schema.ts';
import type { Leistung } from '../services/noten-service.ts';
import { fachRuler } from './fach-ruler.ts';

/**
 * Entering a Note, without the screen: what the form holds, what it would do
 * to the Fach, and how it is worded. The Fachschnitt of the preview comes
 * from the same functions that compute the real one.
 */

/** What is being entered. `wert` is `null` while the disc is not on the bar. */
export type EntryDraft = {
  readonly kind: Leistungsart;
  readonly wert: number | null;
  readonly gewicht: number;
  readonly datum: string;
  readonly notiz: string;
};

export type EntryFach = {
  readonly id: string;
  readonly name: string;
  readonly gewichtung: Fachgewichtung;
};

/** `new`: a Leistung that does not exist yet. `grade`: one that waits for its Note. `change`: one that has a Note. */
export type EntryMode = 'new' | 'grade' | 'change';

export const entryMode = (leistung: Leistung | null): EntryMode => {
  if (leistung === null) {
    return 'new';
  }
  return leistung.status === 'graded' ? 'change' : 'grade';
};

/** The id the entry goes by among the Leistungen of its Fach. */
const newId = '§neu';

export const draftId = (leistung: Leistung | null): string =>
  leistung?.id ?? newId;

/** What the form starts with: the Leistung's own values, or an empty Klausur on `defaultDate`. */
export const draftOf = (
  leistung: Leistung | null,
  defaultDate: string,
): EntryDraft =>
  leistung === null
    ? { kind: 'klausur', wert: null, gewicht: 1, datum: defaultDate, notiz: '' }
    : {
        kind: leistung.kind,
        wert: leistung.status === 'graded' ? leistung.wert : null,
        gewicht: leistung.gewicht,
        datum: leistung.datum,
        notiz: leistung.notiz ?? '',
      };

/** A Leistungsart as the subject and as the object of a sentence. */
const noun: Readonly<
  Record<Leistungsart, { readonly subject: string; readonly object: string }>
> = {
  klausur: { subject: 'die Klausur', object: 'die Klausur' },
  gfs: { subject: 'die GFS', object: 'die GFS' },
  test: { subject: 'der Test', object: 'den Test' },
  muendlich: { subject: 'die mündliche Note', object: 'die mündliche Note' },
  sonstige: { subject: 'die sonstige Note', object: 'die sonstige Note' },
};

const changeTitle: Readonly<Record<Leistungsart, string>> = {
  klausur: 'Klausur ändern',
  gfs: 'GFS ändern',
  test: 'Test ändern',
  muendlich: 'Mündliche Note ändern',
  sonstige: 'Sonstige Note ändern',
};

/** "Neue Note in Physik", "Note für die Klausur eintragen", "Klausur ändern". */
export const entryTitle = (
  leistung: Leistung | null,
  fachName: string,
): string => {
  if (leistung === null) {
    return `Neue Note in ${fachName}`;
  }
  return leistung.status === 'graded'
    ? changeTitle[leistung.kind]
    : `Note für ${noun[leistung.kind].object} eintragen`;
};

/** A Leistung may be entered without a Note only if its date is announced beforehand. */
export const canSubmit = (draft: EntryDraft): boolean =>
  draft.wert !== null || isPlanbar(draft.kind);

export const submitLabel = (
  mode: EntryMode,
  draft: EntryDraft,
  pending: boolean,
): string => {
  const saves = mode === 'change' || (mode === 'grade' && draft.wert === null);
  if (pending) {
    return saves ? 'Wird gespeichert …' : 'Wird eingetragen …';
  }
  if (saves) {
    return 'Änderung speichern';
  }
  // A Leistungsart that cannot wait for its Note is never offered as ausstehend.
  return draft.wert === null && isPlanbar(draft.kind)
    ? 'Als ausstehend eintragen'
    : 'Note eintragen';
};

/**
 * Which Wertungsbereich the Leistungsart falls into. Only said where the Fach
 * weighs the two against each other; elsewhere it changes nothing.
 */
export const kindHint = (
  kind: Leistungsart,
  gewichtung: Fachgewichtung,
): string | null => {
  if (gewichtung.verhaeltnis === null) {
    return null;
  }
  return bereichDerLeistungsart[kind] === 'schriftlich'
    ? 'Zählt als schriftlich.'
    : 'Zählt als mündlich.';
};

const hundredths = 100;

/** A figure without its unit, for the middle of a sentence: "11,4". */
export const figureText = (value: number): string =>
  `${Math.round(value * hundredths) / hundredths}`.replace('.', ',');

export const gewichtText = (gewicht: number): string =>
  `${figureText(gewicht)}-fach`;

/** One step of the Gewicht stepper, on the grid and inside the limits the form has always had. */
export const stepGewicht = (gewicht: number, direction: -1 | 1): number => {
  const step = notenLimits.gewichtungStep;
  const next = (Math.round(gewicht / step) + direction) * step;
  return Math.min(notenLimits.maxGewichtung, Math.max(step, next));
};

/** The index of the step that lies nearest to `target`. */
const nearestIndex = (steps: ReadonlyArray<number>, target: number): number =>
  steps.reduce(
    (best, step, at) =>
      Math.abs(step - target) < Math.abs((steps[best] ?? step) - target)
        ? at
        : best,
    0,
  );

/**
 * One step along the bar from `value`. Without a value the disc is set down
 * at the step nearest to `start`, such as the Fachschnitt, or in the middle
 * of the bar.
 */
export const nudge = ({
  direction,
  start,
  steps,
  value,
}: {
  readonly direction: -1 | 1;
  readonly start: number | null;
  /** The values of the bar from its left end to its right. */
  readonly steps: ReadonlyArray<number>;
  readonly value: number | null;
}): number | null => {
  if (value === null) {
    const middle = Math.floor(steps.length / 2);
    return steps[start === null ? middle : nearestIndex(steps, start)] ?? null;
  }
  const index = Math.min(
    steps.length - 1,
    Math.max(0, nearestIndex(steps, value) + direction),
  );
  return steps[index] ?? null;
};

/** The Leistungen of the Fach as they would be with this entry. */
export const withDraft = ({
  draft,
  fach,
  leistung,
  leistungen,
}: {
  readonly draft: EntryDraft;
  readonly fach: EntryFach;
  readonly leistung: Leistung | null;
  readonly leistungen: ReadonlyArray<Leistung>;
}): ReadonlyArray<Leistung> => {
  const base = {
    id: draftId(leistung),
    kind: draft.kind,
    gewicht: draft.gewicht,
    datum: draft.datum,
    notiz: null,
    fachId: fach.id,
    fachName: fach.name,
    fachKuerzel: leistung?.fachKuerzel ?? '',
    gewichtung: fach.gewichtung,
  };
  const own: Leistung =
    draft.wert === null
      ? { ...base, status: 'planned' }
      : { ...base, status: 'graded', wert: draft.wert };
  return [...leistungen.filter((entry) => entry.id !== base.id), own];
};

export type EntryPreview = {
  /** What the entry counts: now if it has a Note, once every Leistung has one otherwise. */
  readonly share: number;
  /** The Fachschnitt with this entry; `null` while the Fach has no Note. */
  readonly average: number | null;
  readonly candidate: RulerCandidate;
};

export const previewEntry = ({
  draft,
  fach,
  leistung,
  leistungen,
  system,
  today,
}: {
  readonly draft: EntryDraft;
  readonly fach: EntryFach;
  readonly leistung: Leistung | null;
  /** The Leistungen of the Fach in this Halbjahr. */
  readonly leistungen: ReadonlyArray<Leistung>;
  readonly system: Notensystem;
  readonly today: string;
}): EntryPreview => {
  const standing = fachRuler({
    gewichtung: fach.gewichtung,
    leistungen,
    system,
    today,
  }).evaluation.average;
  const { evaluation, shares } = fachRuler({
    gewichtung: fach.gewichtung,
    leistungen: withDraft({ draft, fach, leistung, leistungen }),
    system,
    today,
  });
  const share = shares.get(draftId(leistung)) ?? 0;
  // The fulcrum stays where the Fach stands now; a preview that says the same would only blur it.
  const moves =
    draft.wert !== null &&
    evaluation.average !== null &&
    (standing === null ||
      figureText(standing) !== figureText(evaluation.average));
  return {
    share,
    average: evaluation.average,
    candidate: {
      value: draft.wert,
      date: draft.datum,
      mass: share,
      kind:
        bereichDerLeistungsart[draft.kind] === 'schriftlich'
          ? 'schriftlich'
          : 'muendlich',
      fulcrum: moves ? evaluation.average : null,
      replaces: leistung?.id ?? null,
      text:
        draft.wert === null
          ? `zählt ${anteilText(share)}`
          : formatNote(draft.wert, system),
    },
  };
};

const averageText = (average: number, system: Notensystem): string => {
  if (system === 'sechser') {
    return figureText(average);
  }
  const figure = figureText(average);
  return `${figure}${nbsp}${figure === '1' ? 'Notenpunkt' : 'Notenpunkten'}`;
};

/** What the readout says under the figure: what the Note counts and where it leaves the Fach. */
export const readoutHint = ({
  draft,
  fachName,
  preview,
  system,
}: {
  readonly draft: EntryDraft;
  readonly fachName: string;
  readonly preview: EntryPreview;
  readonly system: Notensystem;
}): string => {
  if (draft.wert !== null) {
    const counts = `Zählt ${anteilText(preview.share)} des Fachschnitts.`;
    return preview.average === null
      ? counts
      : `${counts} Danach steht ${fachName} bei ${averageText(preview.average, system)}.`;
  }
  const place = 'Setze den Punkt auf die Skala.';
  return isPlanbar(draft.kind)
    ? `${place} Ohne Note wird ${noun[draft.kind].subject} als ausstehend eingetragen und zählt später ${anteilText(preview.share)}.`
    : `${place} Ohne Note lassen sich nur Klausur, GFS und Test eintragen.`;
};

export type ValueWords = {
  /** Names the readout: what kind of figure the bar reads. */
  readonly label: string;
  /** Names the choice on the bar for screen readers. */
  readonly legend: string;
  readonly valueLabel: (value: number) => string;
  /** One step towards the bar's left end and one towards its right. */
  readonly stepLeft: string;
  readonly stepRight: string;
};

/** How a value on the bar is spoken about in each Notensystem. Both bars get better to the right. */
export const valueWords = (system: Notensystem): ValueWords =>
  system === 'punkte'
    ? {
        label: 'Notenpunkte',
        legend: 'Notenpunkte auf der Skala wählen',
        valueLabel: (value) =>
          `${value} ${value === 1 ? 'Notenpunkt' : 'Notenpunkte'}`,
        stepLeft: 'Ein Notenpunkt weniger',
        stepRight: 'Ein Notenpunkt mehr',
      }
    : {
        label: 'Note',
        legend: 'Note auf der Skala wählen',
        valueLabel: (value) => `Note ${figureText(value)}`,
        stepLeft: 'Eine Viertelnote schlechter',
        stepRight: 'Eine Viertelnote besser',
      };

/** What is sent: the draft for the Fach it is entered in. */
export const fieldsOf = (draft: EntryDraft, fachId: string): NotenFields => ({
  subjectId: fachId,
  kind: draft.kind,
  wert: draft.wert,
  gewicht: draft.gewicht,
  datum: draft.datum,
  notiz: draft.notiz.trim() === '' ? null : draft.notiz.trim(),
});
