import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { Fachgewichtung } from '#/shared/noten/notenwert.ts';
import { leistungKey, notenKey } from '#/shared/query/query-keys.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import type { NotenFields } from '../schemas/note-schema.ts';
import type { Leistung, LeistungDetail } from '../services/noten-service.ts';
import type { LeistungOperations } from './leistung-operations.ts';
import {
  leistungQueryOptions,
  seedLeistungPages,
  withoutLeistung,
} from './leistung-queries.ts';
import type { EntryDraft } from './note-entry-model.ts';
import type { NoteEntryState } from './noten-bench.tsx';
import { invalidateNotenQueries } from './noten-invalidation.ts';
import { focusChooser, revealFach } from './noten-list-focus.ts';
import {
  type FachGroup,
  fachGroups,
  type SelectableFach,
  savedText,
  updateErrorText,
} from './noten-list-model.ts';
import type { NotenOperations } from './noten-operations.ts';

export type LeistungData =
  | { readonly state: 'pending' }
  /** The server says there is no such Leistung. */
  | { readonly state: 'missing' }
  | { readonly state: 'failed'; readonly error: unknown }
  | {
      readonly state: 'loaded';
      readonly detail: LeistungDetail;
      /** Every Leistung of the Halbjahr. */
      readonly noten: ReadonlyArray<Leistung>;
      /** Why the last refresh failed; what is shown is the answer before it. */
      readonly refreshError: unknown | null;
    };

/**
 * What the page of a Leistung is drawn from: the Leistung with its Halbjahr,
 * and the Noten of that Halbjahr, among them the others of its Fach.
 */
export const useLeistungData = ({
  leistungId,
  leistungOperations,
  notenOperations,
}: {
  readonly leistungId: string;
  readonly leistungOperations: LeistungOperations;
  readonly notenOperations: NotenOperations;
}) => {
  const queryClient = useQueryClient();
  const detailQuery = useQuery(
    leistungQueryOptions(leistungOperations, leistungId),
  );
  const detail = detailQuery.data;
  const halbjahrId = detail?.halbjahr.id;
  const notenQuery = useQuery({
    enabled: halbjahrId !== undefined,
    queryFn: () => notenOperations.list(halbjahrId ?? ''),
    queryKey: notenKey(halbjahrId ?? ''),
  });
  const noten = notenQuery.data;
  const listLoadedAt = notenQuery.dataUpdatedAt;
  useEffect(() => {
    if (detail === undefined || detail === null || noten === undefined) {
      return;
    }
    seedLeistungPages(queryClient, {
      halbjahr: detail.halbjahr,
      leistungen: noten.filter(
        (other) => other.fachId === detail.leistung.fachId,
      ),
      updatedAt: listLoadedAt,
    });
  }, [detail, noten, listLoadedAt, queryClient]);

  const data = ((): LeistungData => {
    if (detail === null) {
      return { state: 'missing' };
    }
    const error = detailQuery.error ?? notenQuery.error;
    if (detail !== undefined && noten !== undefined) {
      return { state: 'loaded', detail, noten, refreshError: error };
    }
    return error === null ? { state: 'pending' } : { state: 'failed', error };
  })();

  return {
    data,
    /** Asks again for what failed. */
    refetch: () =>
      Promise.all([
        detailQuery.isError ? detailQuery.refetch() : null,
        notenQuery.isError ? notenQuery.refetch() : null,
      ]).then((results) => ({
        isSuccess: results.every((result) => result?.isSuccess ?? true),
      })),
  };
};

/**
 * What is open on the page. `fachId` is the Fach on whose bench the Note is
 * entered: `null` for the Leistung's own, another one while the Leistung is
 * being moved there.
 */
type Open =
  | {
      readonly kind: 'entry';
      readonly fachId: string | null;
      readonly draft?: EntryDraft;
    }
  /** The Fach to move to is being chosen; `draft` is what was typed so far. */
  | {
      readonly kind: 'choose';
      readonly fachId: string | null;
      readonly draft: EntryDraft;
    };

const openKey = (open: Open | null): string | null => {
  if (open === null) {
    return null;
  }
  return open.kind === 'choose' ? 'choose' : `entry ${open.fachId ?? ''}`;
};

/**
 * The entry of the page, in step with the address: `eintragen` in the address
 * opens it, and once it is closed the address is told to stop asking.
 */
const useOpenEntry = (eintragen: boolean, onEntryAnswered: () => void) => {
  const [open, setOpen] = useState<Open | null>(null);
  const [landingId, setLandingId] = useState<string | null>(null);
  const [seen, setSeen] = useState(false);
  if (seen !== eintragen) {
    setSeen(eintragen);
    if (eintragen && open === null) {
      setOpen({ kind: 'entry', fachId: null });
    }
  }
  // A disc lands once. Left set, it would land again when the next entry closes.
  if (open !== null && landingId !== null) {
    setLandingId(null);
  }
  const onAnsweredRef = useRef(onEntryAnswered);
  useEffect(() => {
    onAnsweredRef.current = onEntryAnswered;
  });
  const answered = eintragen && seen && open === null;
  useEffect(() => {
    if (answered) {
      onAnsweredRef.current();
    }
  }, [answered]);
  return { open, setOpen, landingId, setLandingId };
};

/** Where a deleted Leistung was: the page it leaves for. */
export type LeistungPlace = {
  readonly halbjahrId: string;
  readonly fachId: string;
};

export type LeistungPageInput = {
  readonly detail: LeistungDetail;
  /** The address asks for the entry to be open. */
  readonly eintragen: boolean;
  /** The Fächer of the school year, to move the Leistung to another one; `null` while they load. */
  readonly faecher: ReadonlyArray<SelectableFach> | null;
  readonly noten: ReadonlyArray<Leistung>;
  readonly notenOperations: NotenOperations;
  /** The Leistung is deleted, so the page has nothing left to show. Resolves once the page is left. */
  readonly onDeleted: (place: LeistungPlace) => Promise<unknown>;
  /** The entry the address asked for is closed. */
  readonly onEntryAnswered: () => void;
};

type BenchFach = {
  readonly id: string;
  readonly name: string;
  readonly gewichtung: Fachgewichtung;
};

/** Changing and deleting the Leistung, and what the page says afterwards. */
const useWrites = ({
  entry,
  fachNameOf,
  input: { detail, notenOperations, onDeleted },
}: {
  readonly entry: ReturnType<typeof useOpenEntry>;
  /** The name of a Fach of the Halbjahr, for what is said once the Leistung is saved there. */
  readonly fachNameOf: (fachId: string) => string;
  readonly input: LeistungPageInput;
}) => {
  const { halbjahr, leistung } = detail;
  const queryClient = useQueryClient();
  const [announcement, setAnnouncement] = useState('');
  const updateMutation = useMutation({
    mutationFn: (values: NotenFields) =>
      notenOperations.update({ ...values, id: leistung.id }),
    // The entry closes once the page shows the Note that was saved, so its disc has somewhere to land.
    onSuccess: async (_result, values) => {
      await invalidateNotenQueries(queryClient, halbjahr.id);
      entry.setLandingId(leistung.id);
      entry.setOpen(null);
      setAnnouncement(
        savedText({
          fachName: fachNameOf(values.subjectId),
          system: halbjahr.system,
          values,
          verb: 'Gespeichert',
        }),
      );
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => notenOperations.delete(leistung.id),
    onSuccess: async () => {
      await invalidateNotenQueries(
        withoutLeistung(queryClient, leistung.id),
        halbjahr.id,
      );
      await onDeleted({ halbjahrId: halbjahr.id, fachId: leistung.fachId });
      // Once the page is left, nothing holds its last answer; going back asks again and learns that the Leistung is gone.
      queryClient.removeQueries({
        queryKey: leistungKey(leistung.id),
        type: 'inactive',
      });
    },
  });
  return { announcement, updateMutation, deleteMutation };
};

/**
 * Moves the keyboard and the view with what is open: the choice of a Fach
 * takes the keyboard, the bench an entry is on comes into view, and the
 * button that opens the entry takes the keyboard back when the entry closes.
 */
const useEntryFocus = (open: Open | null, benchFachId: string) => {
  const key = openKey(open);
  const focus = useFormFocus<HTMLButtonElement>(key);
  const regionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (key === 'choose') {
      focusChooser(regionRef.current);
    } else if (key !== null) {
      revealFach(regionRef.current, benchFachId);
    }
  }, [key, benchFachId]);
  return { entryButtonRef: focus.fallbackTriggerRef, regionRef };
};

/** Everything the page of a Leistung holds and does once the Leistung is loaded, without how it looks. */
export const useLeistungPage = (input: LeistungPageInput) => {
  const { detail, eintragen, faecher, noten, onEntryAnswered } = input;
  const { leistung } = detail;
  const entry = useOpenEntry(eintragen, onEntryAnswered);
  const { open, setOpen } = entry;
  const [asking, setAsking] = useState(false);
  const groups = useMemo(
    () => fachGroups(faecher ?? [], noten),
    [faecher, noten],
  );
  const { announcement, deleteMutation, updateMutation } = useWrites({
    entry,
    fachNameOf: (fachId) =>
      fachId === leistung.fachId
        ? leistung.fachName
        : (groups.find((group) => group.id === fachId)?.name ?? ''),
    input,
  });
  const selectable = groups.filter((group) => !group.archived);
  /** The Leistungen of the Leistung's own Fach, with the Leistung as the page loaded it. */
  const leistungen = useMemo(() => {
    const inFach = noten.filter((other) => other.fachId === leistung.fachId);
    return inFach.some((other) => other.id === leistung.id)
      ? inFach.map((other) => (other.id === leistung.id ? leistung : other))
      : [...inFach, leistung];
  }, [noten, leistung]);
  const target: FachGroup | undefined =
    open?.kind === 'entry' && open.fachId !== null
      ? groups.find((group) => group.id === open.fachId)
      : undefined;
  const benchFach: BenchFach = target ?? {
    id: leistung.fachId,
    name: leistung.fachName,
    gewichtung: leistung.gewichtung,
  };

  const { entryButtonRef, regionRef } = useEntryFocus(open, benchFach.id);

  const benchEntry: NoteEntryState | null =
    open?.kind === 'entry'
      ? {
          leistung,
          ...(open.draft === undefined ? {} : { draft: open.draft }),
          pending: updateMutation.isPending,
          error: updateMutation.isError
            ? updateErrorText(updateMutation.error)
            : null,
          onSave: (values) => {
            updateMutation.reset();
            updateMutation.mutate(values);
          },
          onCancel: () => {
            updateMutation.reset();
            setOpen(null);
          },
          // Where there is no other Fach, there is nowhere to take the Leistung.
          ...(selectable.some((other) => other.id !== benchFach.id)
            ? {
                onOtherFach: (draft) =>
                  setOpen({ kind: 'choose', fachId: open.fachId, draft }),
              }
            : {}),
        }
      : null;

  return {
    regionRef,
    entryButtonRef,
    announcement,
    leistungen,
    /** An entry or the choice of a Fach is open. */
    entering: open !== null,
    bench: {
      fach: benchFach,
      leistungen: target === undefined ? leistungen : target.leistungen,
      entry: benchEntry,
      landingId: entry.landingId,
      /** The bench shows another Fach while the Leistung is being moved there. */
      own: target === undefined,
    },
    chooser:
      open?.kind === 'choose'
        ? {
            groups: selectable,
            onCancel: (): void =>
              setOpen({
                kind: 'entry',
                fachId: open.fachId,
                draft: open.draft,
              }),
            onPick: (fachId: string): void =>
              setOpen({
                kind: 'entry',
                fachId: fachId === leistung.fachId ? null : fachId,
                draft: open.draft,
              }),
          }
        : null,
    actions: {
      asking,
      deleteError: deleteMutation.isError ? deleteMutation.error : null,
      deleting: deleteMutation.isPending,
      onAsk: (): void => setAsking(true),
      onDelete: (): void => deleteMutation.mutate(),
      onEnter: (): void => setOpen({ kind: 'entry', fachId: null }),
      onKeep: (): void => {
        deleteMutation.reset();
        setAsking(false);
      },
    },
  };
};
