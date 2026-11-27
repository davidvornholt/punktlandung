import type { Dispatch, SetStateAction } from 'react';

import { formatIsoDate } from '#/shared/date/calendar-date.ts';
import type { FachEvaluation } from '#/shared/noten/fach-aggregation.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import { notenCountText } from '#/shared/noten/noten-count-text.ts';
import type { Fachgewichtung, Notensystem } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import type { NotenFields } from '../schemas/note-schema.ts';
import type { Leistung } from '../services/noten-service.ts';
import { draftId, type EntryDraft, figureText } from './note-entry-model.ts';

/**
 * Gescheiterte Änderungen, je Note festgehalten. Die Notenliste teilt sich
 * eine Mutation über alle Zeilen, und die kennt nur ihren letzten Ausgang.
 */
export type UpdateErrors = ReadonlyMap<string, unknown>;

export const noUpdateErrors: UpdateErrors = new Map();

export const withoutNote = (errors: UpdateErrors, id: string): UpdateErrors => {
  const rest = new Map(errors);
  rest.delete(id);
  return rest;
};

export const withNote = (
  errors: UpdateErrors,
  id: string,
  error: unknown,
): UpdateErrors => new Map(errors).set(id, error);

export const updateErrorText = (error: unknown) =>
  error === undefined
    ? null
    : actionErrorText(
        error,
        'Die Note konnte nicht geändert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
      );

export const createErrorText = (error: unknown): string =>
  actionErrorText(
    error,
    'Die Note konnte wegen eines technischen Fehlers nicht gespeichert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
  );

/** A Fach a Note can be entered in. */
export type SelectableFach = {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly gewichtung: Fachgewichtung;
};

/** One Fach of the page with its Leistungen in the Halbjahr shown. */
export type FachGroup = {
  readonly id: string;
  readonly name: string;
  readonly kuerzel: string;
  readonly gewichtung: Fachgewichtung;
  /**
   * The Fach is no longer part of the school year. Its Noten stay and can be
   * corrected, but no new one can be entered.
   */
  readonly archived: boolean;
  readonly leistungen: ReadonlyArray<Leistung>;
};

/**
 * The Fächer of the page: every selectable Fach in its own order, with or
 * without Leistungen, then each archived Fach that still has some.
 */
export const fachGroups = (
  faecher: ReadonlyArray<SelectableFach>,
  noten: ReadonlyArray<Leistung>,
): ReadonlyArray<FachGroup> => {
  const of = (fachId: string) =>
    noten.filter((leistung) => leistung.fachId === fachId);
  const selectable = new Set(faecher.map((fach) => fach.id));
  const archived = new Map(
    noten
      .filter((leistung) => !selectable.has(leistung.fachId))
      .map((leistung) => [leistung.fachId, leistung]),
  );
  return [
    ...faecher.map((fach) => ({
      id: fach.id,
      name: fach.name,
      kuerzel: fach.shortName,
      gewichtung: fach.gewichtung,
      archived: false,
      leistungen: of(fach.id),
    })),
    ...[...archived.values()]
      .sort((a, b) => a.fachName.localeCompare(b.fachName, 'de'))
      .map((leistung) => ({
        id: leistung.fachId,
        name: leistung.fachName,
        kuerzel: leistung.fachKuerzel,
        gewichtung: leistung.gewichtung,
        archived: true,
        leistungen: of(leistung.fachId),
      })),
  ];
};

/** "2 Noten · 1 ausstehend · schriftlich 12 · mündlich 9" */
export const metaText = ({
  evaluation,
  leistungen,
}: {
  readonly evaluation: FachEvaluation;
  readonly leistungen: ReadonlyArray<Leistung>;
}): string => {
  if (leistungen.length === 0) {
    return 'Noch keine Note';
  }
  const graded = leistungen.filter(
    (leistung) => leistung.status === 'graded',
  ).length;
  const waiting = leistungen.length - graded;
  const { schriftlichAverage, muendlichAverage } = evaluation;
  return [
    ...(graded > 0 ? [notenCountText(graded)] : []),
    ...(waiting > 0 ? [`${waiting} ausstehend`] : []),
    // One Bereich alone is the Fachschnitt, which stands under the bar already.
    ...(schriftlichAverage === null || muendlichAverage === null
      ? []
      : [
          `schriftlich ${figureText(schriftlichAverage)}`,
          `mündlich ${figureText(muendlichAverage)}`,
        ]),
  ].join(' · ');
};

/** What is typed when an entry goes to another Fach, and where it came from. */
export type Carry = {
  readonly leistung: Leistung | null;
  readonly draft: EntryDraft;
  /** The Fach the entry was open in; cancelling the choice goes back there. */
  readonly fachId: string;
};

/**
 * What is open on the page: the choice of a Fach, or an entry on the bench of
 * one. Only one is open at a time.
 */
export type OpenEntry =
  | { readonly kind: 'choose'; readonly carry: Carry | null }
  | {
      readonly kind: 'entry';
      /** `null`: a new Note. */
      readonly leistung: Leistung | null;
      /** The Fach on whose bench the entry is open. It differs from the Leistung's own while it is being moved. */
      readonly fachId: string;
      readonly draft?: EntryDraft;
      /** The id a new Note was sent under; its Leistung is the one this entry waits for. */
      readonly savingId?: string;
    };

export type OpenEntryState = {
  readonly open: OpenEntry | null;
  readonly setOpen: Dispatch<SetStateAction<OpenEntry | null>>;
  /** The Leistung that was just saved: its disc lands and its row is marked. */
  readonly landed: string | null;
  readonly setLanded: (id: string | null) => void;
};

export type NotenHalbjahr = {
  readonly id: string;
  readonly system: Notensystem;
  readonly startsOn: string;
  readonly endsOn: string;
};

/** What the address says about the list, besides the Halbjahr. */
export type NotenListSearch = {
  /** With `neu` the Fach a Note is entered in, without it the Fach to go to. */
  readonly fach?: string;
  readonly neu?: true;
};

/** Changes what the address says. `replace: false` adds a step that "back" undoes. */
export type SearchChange = (
  search: NotenListSearch,
  options: { readonly replace: boolean },
) => void;

/** Tells one open state from another; `null` when nothing is open. */
export const openKey = (open: OpenEntry | null): string | null => {
  if (open === null) {
    return null;
  }
  return open.kind === 'choose'
    ? 'choose'
    : `${open.fachId} ${draftId(open.leistung)}`;
};

/** Whether what is open is about a Note that does not exist yet; the address says so with `neu`. */
export const asksForNew = (open: OpenEntry | null): boolean =>
  open !== null &&
  (open.kind === 'choose'
    ? (open.carry?.leistung ?? null) === null
    : open.leistung === null);

/**
 * What the address opens. `neu` asks for a new Note: in `fach` if that is a
 * Fach a Note can be entered in, otherwise the Fach is asked for first. When
 * the address stops asking, what it had opened closes and a Leistung that is
 * being changed stays.
 */
export const fromSearch = (
  open: OpenEntry | null,
  search: { readonly neu?: true; readonly fach?: string },
  isSelectable: (fachId: string) => boolean,
): OpenEntry | null => {
  if (search.neu !== true) {
    return asksForNew(open) ? null : open;
  }
  const { fach } = search;
  if (fach === undefined || !isSelectable(fach)) {
    return open?.kind === 'choose' && open.carry === null
      ? open
      : { kind: 'choose', carry: null };
  }
  // The entry that is open there keeps what was typed into it.
  return open?.kind === 'entry' &&
    open.leistung === null &&
    open.fachId === fach
    ? open
    : { kind: 'entry', leistung: null, fachId: fach };
};

/** Whether the entry that is open is the one for this Leistung, be it changed or new. */
export const isOpenFor = (open: OpenEntry | null, id: string): boolean =>
  open?.kind === 'entry' && (open.leistung?.id === id || open.savingId === id);

/**
 * Schließt die Bearbeitung nur, wenn der abgeschlossene Vorgang ihr galt: der
 * Benutzer kann inzwischen eine andere Note geöffnet haben.
 */
export const closeIfSaved =
  (id: string) =>
  (open: OpenEntry | null): OpenEntry | null =>
    isOpenFor(open, id) ? null : open;

/** What the live region says once a Leistung is gone. */
export const deletedText = (leistung: Leistung): string =>
  `Gelöscht: ${leistung.fachName}, ${leistungsartLabel[leistung.kind]} vom ${formatIsoDate(leistung.datum)}.`;

/**
 * Whether the section of a Fach is still there once the Noten are loaded
 * again: a Fach of the school year always is, an archived one only for as
 * long as it has a Leistung.
 */
export const fachStays = (
  group: FachGroup | undefined,
  noten: ReadonlyArray<Leistung>,
): boolean =>
  group !== undefined &&
  (!group.archived || noten.some((leistung) => leistung.fachId === group.id));

/** The page as it is drawn: the Note a new entry waits for is held back, so it lands when the entry closes. */
export const withoutWaiting = (
  groups: ReadonlyArray<FachGroup>,
  open: OpenEntry | null,
): ReadonlyArray<FachGroup> => {
  if (open?.kind !== 'entry' || open.savingId === undefined) {
    return groups;
  }
  const { fachId, savingId } = open;
  return groups.map((group) =>
    group.id === fachId
      ? {
          ...group,
          leistungen: group.leistungen.filter(
            (leistung) => leistung.id !== savingId,
          ),
        }
      : group,
  );
};

/** What the live region says once a Note is saved: "Eingetragen: Physik, Klausur vom 26.11.2026, 10 P." */
export const savedText = ({
  fachName,
  system,
  values,
  verb,
}: {
  readonly fachName: string;
  readonly system: Notensystem;
  readonly values: Pick<NotenFields, 'datum' | 'kind' | 'wert'>;
  readonly verb: 'Eingetragen' | 'Gespeichert';
}): string => {
  const note =
    values.wert === null ? 'noch ohne Note' : formatNote(values.wert, system);
  // "10 P." ends the sentence itself.
  return `${verb}: ${fachName}, ${leistungsartLabel[values.kind]} vom ${formatIsoDate(values.datum)}, ${note}${note.endsWith('.') ? '' : '.'}`;
};
