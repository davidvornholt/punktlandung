import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { type RefObject, useEffect, useRef, useState } from 'react';

import { notenKey } from '#/shared/query/query-keys.ts';
import type { NotenFields } from '../schemas/note-schema.ts';
import type { Leistung } from '../services/noten-service.ts';
import { createSubmissionIds } from './note-submission.ts';
import { focusAfterDelete, focusRow } from './noten-list-focus.ts';
import {
  closeIfSaved,
  createErrorText,
  deletedText,
  type FachGroup,
  fachStays,
  isOpenFor,
  type NotenHalbjahr,
  noUpdateErrors,
  type OpenEntry,
  type OpenEntryState,
  savedText,
  updateErrorText,
  withNote,
  withoutNote,
} from './noten-list-model.ts';
import { notenMutationOptions } from './noten-mutations.ts';
import type { NotenOperations } from './noten-operations.ts';
import { usePendingUpdates } from './use-pending-updates.ts';

type WritesInput = {
  readonly entry: OpenEntryState;
  /** Keeps the keyboard from going back to the button that opened the entry. */
  readonly suppressFocusRestore: () => void;
  readonly groups: ReadonlyArray<FachGroup>;
  readonly halbjahr: NotenHalbjahr;
  readonly operations: NotenOperations;
  readonly regionRef: RefObject<HTMLElement | null>;
};

/**
 * What a callback of a mutation needs. A mutation that was replaced by a
 * later one keeps the callbacks it started with, so they read the page as it
 * is now from `latestRef` and change state only through updaters.
 */
type Tools = WritesInput & {
  readonly queryClient: QueryClient;
  readonly latestRef: RefObject<{
    readonly groups: ReadonlyArray<FachGroup>;
    readonly open: OpenEntry | null;
  }>;
  readonly deletingRef: RefObject<Map<string, Leistung>>;
  readonly announce: (text: string) => void;
  readonly focusRowOf: (id: string) => void;
  readonly forgetUpdateError: (id: string) => void;
};

const fachOf = (tools: Tools, fachId: string): FachGroup | undefined =>
  tools.latestRef.current.groups.find((group) => group.id === fachId);

const onSaved = (
  tools: Tools,
  values: NotenFields & { readonly id: string },
  verb: 'Eingetragen' | 'Gespeichert',
): void => {
  const { open } = tools.latestRef.current;
  const moved =
    open?.kind === 'entry' &&
    open.leistung?.id === values.id &&
    open.leistung.fachId !== values.subjectId;
  if (moved) {
    // The row that opened the entry is gone from its Fach; the keyboard follows the Note to its new one.
    tools.suppressFocusRestore();
    tools.focusRowOf(values.id);
  }
  tools.entry.setOpen(closeIfSaved(values.id));
  tools.entry.setLanded(values.id);
  tools.announce(
    savedText({
      fachName: fachOf(tools, values.subjectId)?.name ?? '',
      system: tools.halbjahr.system,
      values,
      verb,
    }),
  );
};

const onDeleted = (tools: Tools, id: string): void => {
  const leistung = tools.deletingRef.current.get(id) ?? null;
  tools.deletingRef.current.delete(id);
  tools.forgetUpdateError(id);
  // An entry that was open for the Leistung, on the bench of another Fach, has nothing left to save.
  tools.entry.setOpen(closeIfSaved(id));
  if (leistung === null) {
    return;
  }
  tools.announce(deletedText(leistung));
  const noten =
    tools.queryClient.getQueryData<ReadonlyArray<Leistung>>(
      notenKey(tools.halbjahr.id),
    ) ?? [];
  const stays = fachStays(fachOf(tools, leistung.fachId), noten);
  focusAfterDelete(tools.regionRef.current, {
    fachId: stays ? leistung.fachId : null,
    id,
  });
};

/** What the list says and where it puts the keyboard after something was written. */
const useNotices = (regionRef: RefObject<HTMLElement | null>) => {
  const [announcement, setAnnouncement] = useState('');
  const [rowToFocus, setRowToFocus] = useState<string | null>(null);
  useEffect(() => {
    if (rowToFocus !== null) {
      focusRow(regionRef.current, rowToFocus);
      setRowToFocus(null);
    }
  }, [rowToFocus, regionRef]);
  return { announcement, announce: setAnnouncement, focusRowOf: setRowToFocus };
};

/**
 * Entering, changing and deleting a Note of the list. One entry is open at a
 * time, but an earlier one may still be on its way, so every outcome is told
 * to the Note it belongs to.
 */
export const useNotenWrites = (input: WritesInput) => {
  const { entry, groups, halbjahr, operations, regionRef } = input;
  const queryClient = useQueryClient();
  const [updateErrors, setUpdateErrors] = useState(noUpdateErrors);
  const [deleteErrors, setDeleteErrors] = useState(noUpdateErrors);
  /** The Fach of a new Note that failed to save after its entry was closed. */
  const [lostCreate, setLostCreate] = useState<string | null>(null);
  const [submissionIds] = useState(() => createSubmissionIds());
  const notices = useNotices(regionRef);
  const deletingRef = useRef(new Map<string, Leistung>());
  const latestRef = useRef({ groups, open: entry.open });
  useEffect(() => {
    latestRef.current = { groups, open: entry.open };
  });
  const forgetUpdateError = (id: string): void =>
    setUpdateErrors((errors) => withoutNote(errors, id));
  const tools: Tools = {
    ...input,
    queryClient,
    latestRef,
    deletingRef,
    announce: notices.announce,
    focusRowOf: notices.focusRowOf,
    forgetUpdateError,
  };

  const options = notenMutationOptions({
    halbjahrId: halbjahr.id,
    onCreated: (values) => {
      submissionIds.settle(values.id);
      onSaved(tools, values, 'Eingetragen');
    },
    onDeleted: (id) => onDeleted(tools, id),
    onUpdated: (values) => onSaved(tools, values, 'Gespeichert'),
    onUpdateFailed: (id, error) =>
      setUpdateErrors((errors) => withNote(errors, id, error)),
    operations,
    queryClient,
  });
  const createMutation = useMutation({
    ...options.create,
    onError: (_error, values) => {
      // The entry shows the failure itself for as long as it is open.
      if (!isOpenFor(latestRef.current.open, values.id)) {
        setLostCreate(fachOf(tools, values.subjectId)?.name ?? '');
      }
    },
  });
  const deleteMutation = useMutation({
    ...options.delete,
    onError: (error: unknown, id: string) =>
      setDeleteErrors((errors) => withNote(errors, id, error)),
  });
  const open = entry.open?.kind === 'entry' ? entry.open : null;
  const editing = open?.leistung ?? null;
  const { updateMutation, editPending } = usePendingUpdates(
    options.update,
    editing,
  );
  const creating = createMutation.variables?.id === open?.savingId;

  return {
    announcement: notices.announcement,
    lostCreate,
    deleteErrors,
    deleteMutation,
    /** Changes that failed, without the one whose entry is open and says so itself. */
    savedErrors:
      editing === null ? updateErrors : withoutNote(updateErrors, editing.id),
    forgetUpdateError,
    /** How the entry that is open stands with the server. */
    status:
      editing === null
        ? {
            pending: createMutation.isPending && creating,
            error:
              createMutation.isError && creating
                ? createErrorText(createMutation.error)
                : null,
          }
        : {
            pending: editPending,
            error: updateErrorText(updateErrors.get(editing.id)),
          },
    save: (leistung: Leistung | null, values: NotenFields): void => {
      if (leistung !== null) {
        forgetUpdateError(leistung.id);
        updateMutation.mutate({ ...values, id: leistung.id });
        return;
      }
      const id = submissionIds.idFor(halbjahr.id, values);
      entry.setOpen((current) =>
        current?.kind === 'entry' && current.leistung === null
          ? { ...current, savingId: id }
          : current,
      );
      setLostCreate(null);
      createMutation.mutate({ ...values, id, termId: halbjahr.id });
    },
    remove: (leistung: Leistung): void => {
      deletingRef.current.set(leistung.id, leistung);
      setDeleteErrors((errors) => withoutNote(errors, leistung.id));
      deleteMutation.mutate(leistung.id);
    },
  };
};
