import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { notenKey } from '#/shared/query/query-keys.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';
import type { Leistung } from '../services/noten-service.ts';
import type { NoteEntryState } from './noten-bench.tsx';
import type { LeistungLinkComponent } from './noten-links.tsx';
import {
  addButton,
  focusChooser,
  jumpToFach,
  revealFach,
  whenLaidOut,
} from './noten-list-focus.ts';
import {
  asksForNew,
  type FachGroup,
  fachGroups,
  fromSearch,
  type NotenHalbjahr,
  type NotenListSearch,
  type OpenEntry,
  type OpenEntryState,
  openKey,
  type SearchChange,
  type SelectableFach,
  withoutWaiting,
} from './noten-list-model.ts';
import { useNotenWrites } from './noten-list-writes.ts';
import type { NotenOperations } from './noten-operations.ts';

export type NotenListProps = {
  /** The Fächer of the school year, in which a Note can be entered. */
  readonly faecher: ReadonlyArray<SelectableFach>;
  readonly halbjahr: NotenHalbjahr;
  /** How a Leistung is linked to its page. */
  readonly link: LeistungLinkComponent;
  readonly onSearch: SearchChange;
  readonly operations: NotenOperations;
  readonly search: NotenListSearch;
  /** ISO date. */
  readonly today: string;
};

/** What the address asks to be opened; `null` when it asks for nothing. */
const asked = (search: NotenListSearch): string | null =>
  search.neu === true ? `neu:${search.fach ?? ''}` : null;

/**
 * What is open on the page, in step with the address: `neu` in the address
 * opens a new Note, and when that is closed or gives way to something else,
 * `neu` leaves the address.
 */
const useOpenEntry = ({
  isSelectable,
  onSearch,
  search,
}: {
  readonly isSelectable: (fachId: string) => boolean;
  readonly onSearch: SearchChange;
  readonly search: NotenListSearch;
}): OpenEntryState => {
  const [open, setOpen] = useState<OpenEntry | null>(null);
  const [landed, setLanded] = useState<string | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  const request = asked(search);
  if (seen !== request) {
    setSeen(request);
    setOpen(fromSearch(open, search, isSelectable));
  }
  // A disc lands once. Left set, it would land again when an entry that hid it closes.
  if (open !== null && landed !== null) {
    setLanded(null);
  }
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });
  const answered = request !== null && seen === request && !asksForNew(open);
  useEffect(() => {
    if (answered) {
      onSearchRef.current({}, { replace: true });
    }
  }, [answered]);
  return { open, setOpen, landed, setLanded };
};

type FocusInput = {
  readonly loaded: boolean;
  readonly open: OpenEntry | null;
  readonly rememberTrigger: (trigger: HTMLElement) => void;
  readonly region: () => HTMLElement | null;
  readonly search: NotenListSearch;
};

/** Moves the view and the keyboard to what was opened, and to the Fach the address names. */
const useListFocus = ({
  loaded,
  open,
  rememberTrigger,
  region,
  search,
}: FocusInput): void => {
  const latestRef = useRef({ open, rememberTrigger, region });
  useEffect(() => {
    latestRef.current = { open, rememberTrigger, region };
  });
  const key = openKey(open);
  useEffect(() => {
    const now = latestRef.current;
    if (key === null || !loaded || now.open === null) {
      return;
    }
    if (now.open.kind === 'entry') {
      const button =
        now.open.leistung === null
          ? addButton(now.region(), now.open.fachId)
          : null;
      if (button !== null) {
        now.rememberTrigger(button);
      }
      const { fachId } = now.open;
      return whenLaidOut(() => revealFach(now.region(), fachId));
    }
    // Whatever asked for a new Note, such as the button of the top bar, gets the keyboard back.
    const active = document.activeElement;
    if (
      now.open.carry === null &&
      active instanceof HTMLElement &&
      active !== document.body
    ) {
      now.rememberTrigger(active);
    }
    focusChooser(now.region());
  }, [key, loaded]);

  const goTo = search.neu === true ? undefined : search.fach;
  useEffect(() => {
    if (!loaded || goTo === undefined) {
      return;
    }
    return whenLaidOut(() =>
      jumpToFach(latestRef.current.region(), goTo, { arriving: true }),
    );
  }, [goTo, loaded]);
};

/** Everything the Noten list holds and does, without how it looks. */
export const useNotenList = ({
  faecher,
  halbjahr,
  onSearch,
  operations,
  search,
}: NotenListProps) => {
  const notenQuery = useQuery({
    queryFn: () => operations.list(halbjahr.id),
    queryKey: notenKey(halbjahr.id),
  });
  const noten = notenQuery.data;
  const allGroups = useMemo(
    () => fachGroups(faecher, noten ?? []),
    [faecher, noten],
  );
  const entry = useOpenEntry({
    isSelectable: (fachId) => faecher.some((fach) => fach.id === fachId),
    onSearch,
    search,
  });
  const { open, setOpen } = entry;
  const focus = useFormFocus<HTMLElement>(openKey(open));
  const regionRef = focus.fallbackTriggerRef;
  const writes = useNotenWrites({
    entry,
    groups: allGroups,
    halbjahr,
    operations,
    regionRef,
    suppressFocusRestore: focus.suppressNextRestore,
  });
  useListFocus({
    loaded: noten !== undefined,
    open,
    rememberTrigger: focus.rememberTrigger,
    region: () => regionRef.current,
    search,
  });
  const selectable = allGroups.filter((group) => !group.archived);

  const entryFor = (group: FachGroup): NoteEntryState | null => {
    if (open?.kind !== 'entry' || open.fachId !== group.id) {
      return null;
    }
    const { draft, leistung } = open;
    return {
      leistung,
      ...(draft === undefined ? {} : { draft }),
      ...writes.status,
      onSave: (values) => writes.save(leistung, values),
      onCancel: () => setOpen(null),
      // Where there is no other Fach, there is nowhere to take the Note.
      ...(selectable.some((other) => other.id !== group.id)
        ? {
            onOtherFach: (typed) =>
              setOpen({
                kind: 'choose',
                carry: { leistung, draft: typed, fachId: group.id },
              }),
          }
        : {}),
    };
  };

  return {
    regionRef,
    noten,
    isPending: notenQuery.isPending,
    isError: notenQuery.isError,
    retry: retryWithFocus(() => notenQuery.refetch(), regionRef),
    groups: withoutWaiting(allGroups, open),
    selectable,
    open,
    landed: entry.landed,
    writes,
    entryFor,
    jump: (fachId: string): void => jumpToFach(regionRef.current, fachId),
    add: (fachId: string): void =>
      onSearch({ neu: true, fach: fachId }, { replace: false }),
    edit: (leistung: Leistung, trigger: HTMLElement): void => {
      focus.rememberTrigger(trigger);
      /*
       * Wer eine gescheiterte Note erneut öffnet, hat den Fehler gesehen; er
       * darf weder das frische Formular noch die wieder geschlossene Zeile
       * weiter behaupten.
       */
      writes.forgetUpdateError(leistung.id);
      setOpen({ kind: 'entry', leistung, fachId: leistung.fachId });
    },
    /** A Fach is chosen: for a new Note, or for the one that is being moved. */
    pick: (fachId: string): void => {
      if (open?.kind !== 'choose') {
        return;
      }
      const { carry } = open;
      setOpen({
        kind: 'entry',
        leistung: carry?.leistung ?? null,
        fachId,
        ...(carry === null ? {} : { draft: carry.draft }),
      });
      if ((carry?.leistung ?? null) === null) {
        onSearch({ neu: true, fach: fachId }, { replace: true });
      }
    },
    /** The choice is given up: what was typed goes back to the Fach it came from. */
    cancelChoice: (): void => {
      if (open?.kind !== 'choose') {
        return;
      }
      const { carry } = open;
      setOpen(
        carry === null
          ? null
          : {
              kind: 'entry',
              leistung: carry.leistung,
              fachId: carry.fachId,
              draft: carry.draft,
            },
      );
    },
  };
};
