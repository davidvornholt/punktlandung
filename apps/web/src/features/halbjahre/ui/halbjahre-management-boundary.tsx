import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { RefObject } from 'react';
import { useRef, useState } from 'react';

import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { halbjahreKey } from '#/shared/query/query-keys.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import {
  buttonClass,
  primaryButtonClass,
  sheetClass,
} from '#/shared/ui/form-classes.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import { iconSize, iconStroke } from '#/shared/ui/icon.ts';
import { ListQueryHints } from '#/shared/ui/query-state.tsx';
import { determineQueryState } from '#/shared/ui/query-state-model.ts';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import {
  useHalbjahrDeletionCompletion,
  useHalbjahrDeletionFocusCapture,
} from './halbjahr-deletion-completion.ts';
import { HalbjahrForm } from './halbjahr-form.tsx';
import type { HalbjahrFormValues } from './halbjahr-form-model.ts';
import { HalbjahrList } from './halbjahr-list.tsx';
import { halbjahrLooks } from './halbjahr-look.ts';
import { useHalbjahrMutations } from './halbjahr-mutations.ts';
import type { HalbjahrOperations } from './halbjahr-operations.ts';
import { HalbjahrTimeline } from './halbjahr-timeline.tsx';
import type { TimelineCandidate } from './halbjahr-timeline-model.ts';

type EditTarget = HalbjahrWithNotenCount | 'create' | null;

const editKey = (editTarget: EditTarget) => {
  if (editTarget === null || editTarget === 'create') {
    return editTarget;
  }
  return editTarget.id;
};

const halbjahrFormError = (
  createMutation: { readonly error: unknown; readonly isError: boolean },
  updateMutation: { readonly error: unknown; readonly isError: boolean },
): string | null => {
  if (createMutation.isError) {
    return actionErrorText(
      createMutation.error,
      'Das Halbjahr konnte nicht angelegt werden. Prüfe die Verbindung und versuche es erneut.',
    );
  }
  if (updateMutation.isError) {
    return actionErrorText(
      updateMutation.error,
      'Das Halbjahr konnte nicht geändert werden. Die Eingaben bleiben erhalten; versuche es erneut.',
    );
  }
  return null;
};

/** The Halbjahr as the open form holds it, for the time line to draw. */
const candidateOf = (
  editTarget: EditTarget,
  draft: HalbjahrFormValues | null,
): TimelineCandidate | null =>
  editTarget === null || draft === null
    ? null
    : {
        endsOn: draft.endsOn,
        half: draft.half,
        klassenstufe: draft.klassenstufe,
        replaces: editTarget === 'create' ? null : editTarget.id,
        schoolYear: draft.schoolYear,
        startsOn: draft.startsOn,
      };

/**
 * The head of the section and, while there is no Halbjahr yet, the invitation
 * to create the first one. Both are the same elements with other classes
 * instead of a section head here and an `EmptyState` there: deleting the last
 * Halbjahr puts the focus on the button before the list is read again, and a
 * button that moved to another place then would take the focus with it.
 */
const Head = ({
  inviting,
  onCreate,
  triggerRef,
}: {
  readonly inviting: boolean;
  /** Opens the empty form; `null` while a form is open. */
  readonly onCreate: ((trigger: HTMLButtonElement) => void) | null;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
}) => (
  <div
    className={
      inviting
        ? `${sheetClass} desk:p-8 p-5`
        : 'mb-3.5 flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2'
    }
  >
    <h2 className="font-bold text-xl">
      {inviting ? 'Noch kein Halbjahr' : 'Halbjahre'}
    </h2>
    {inviting ? (
      <p className="mt-2 max-w-[60ch] text-ink-soft">
        Jede Note gehört in ein Halbjahr. Es legt fest, von wann bis wann sie
        zählt und ob in Noten von 1 bis 6 oder in Notenpunkten von 0 bis 15. Du
        wählst Klassenstufe, Schuljahr und Halbjahr, den Rest ergänzt
        Punktlandung.
      </p>
    ) : null}
    {onCreate === null ? null : (
      <button
        className={
          inviting
            ? `${primaryButtonClass} mt-5`
            : buttonClass('secondary', 'compact')
        }
        onClick={(event) => onCreate(event.currentTarget)}
        ref={triggerRef}
        type="button"
      >
        <Plus aria-hidden={true} size={iconSize} strokeWidth={iconStroke} />
        Halbjahr anlegen
      </button>
    )}
  </div>
);

/**
 * What is open in the section: the form with the Halbjahr it changes, what
 * the form holds at the moment, and the Halbjahr the pointer is on.
 */
const useHalbjahrEditor = () => {
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [draft, setDraft] = useState<HalbjahrFormValues | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  return {
    candidate: candidateOf(editTarget, draft),
    /** Forgets what the last form held, so the time line never shows it for the next one. */
    change: (target: EditTarget) => {
      setDraft(null);
      setEditTarget(target);
    },
    editTarget,
    highlightId,
    setDraft,
    setHighlightId,
  };
};

/** The query, the open form, the three mutations and how the focus moves between them. */
const useHalbjahreSection = (operations: HalbjahrOperations) => {
  const halbjahreQuery = useQuery({
    queryFn: operations.list,
    queryKey: halbjahreKey,
  });
  const editor = useHalbjahrEditor();
  const { editTarget } = editor;
  const formKey = editKey(editTarget);
  const focus = useFormFocus(formKey);
  const deletionCompletion = useHalbjahrDeletionCompletion(
    focus.formRef,
    focus.fallbackTriggerRef,
  );
  const mutations = useHalbjahrMutations({
    onDeleted: (request) => {
      const { halbjahr } = request;
      if (
        editTarget !== null &&
        editTarget !== 'create' &&
        editTarget.id === halbjahr.id
      ) {
        focus.suppressNextRestore();
        editor.change(null);
      }
      deletionCompletion.complete(request);
    },
    onEditorClose: () => editor.change(null),
    operations,
  });
  return {
    deletionMessage: deletionCompletion.message,
    editor,
    focus,
    formKey,
    halbjahreQuery,
    mutations,
    /** Opens the form for a Halbjahr or an empty one, and remembers where the focus returns to. */
    open: (target: EditTarget, trigger: HTMLButtonElement) => {
      focus.rememberTrigger(trigger);
      mutations.createMutation.reset();
      mutations.updateMutation.reset();
      editor.change(target);
    },
  };
};

type Section = ReturnType<typeof useHalbjahreSection>;

const Editor = ({
  editTarget,
  halbjahre,
  section,
  today,
}: {
  readonly editTarget: Exclude<EditTarget, null>;
  readonly halbjahre: ReadonlyArray<HalbjahrWithNotenCount>;
  readonly section: Section;
  readonly today: string;
}) => {
  const { createMutation, updateMutation } = section.mutations;
  return (
    <HalbjahrForm
      error={halbjahrFormError(createMutation, updateMutation)}
      formRef={section.focus.formRef}
      halbjahr={editTarget === 'create' ? null : editTarget}
      halbjahre={halbjahre}
      onCancel={() => section.editor.change(null)}
      onSave={(values) => {
        if (editTarget === 'create') {
          createMutation.reset();
          createMutation.mutate(values);
        } else {
          updateMutation.reset();
          updateMutation.mutate({ ...values, id: editTarget.id });
        }
      }}
      onValuesChange={section.editor.setDraft}
      pending={createMutation.isPending || updateMutation.isPending}
      title={editTarget === 'create' ? 'Neues Halbjahr' : 'Halbjahr bearbeiten'}
      today={today}
    />
  );
};

export const HalbjahreManagementBoundary = ({
  operations,
}: {
  readonly operations: HalbjahrOperations;
}) => {
  const section = useHalbjahreSection(operations);
  const { editor, halbjahreQuery } = section;
  const { deleteMutation } = section.mutations;
  const { editTarget } = editor;
  const sectionRef = useRef<HTMLElement>(null);
  const captureDeletionFocus = useHalbjahrDeletionFocusCapture();
  const halbjahre = halbjahreQuery.data;
  const queryState = determineQueryState({
    data: halbjahre,
    isError: halbjahreQuery.isError,
    isPending: halbjahreQuery.isPending,
    isEmpty: (values) => values.length === 0,
  });
  const today = berlinCalendarDate();
  return (
    <section aria-label="Halbjahre" ref={sectionRef} tabIndex={-1}>
      <p className="sr-only" role="status">
        {section.deletionMessage}
      </p>
      <Head
        inviting={queryState === 'empty' && editTarget === null}
        onCreate={
          editTarget === null
            ? (trigger) => section.open('create', trigger)
            : null
        }
        triggerRef={section.focus.fallbackTriggerRef}
      />
      {editor.candidate !== null || (halbjahre?.length ?? 0) > 0 ? (
        <HalbjahrTimeline
          candidate={editor.candidate}
          halbjahre={halbjahre ?? []}
          highlightId={editor.highlightId}
          onHighlight={editor.setHighlightId}
          today={today}
        />
      ) : null}
      {editTarget === null ? null : (
        <Editor
          editTarget={editTarget}
          halbjahre={halbjahre ?? []}
          key={section.formKey}
          section={section}
          today={today}
        />
      )}
      <ListQueryHints
        errorText="Die Halbjahre konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
        isError={halbjahreQuery.isError}
        onRetry={retryWithFocus(() => halbjahreQuery.refetch(), sectionRef)}
        pendingText="Halbjahre werden geladen …"
        refreshErrorText="Die Halbjahre konnten nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut."
        state={queryState}
      />
      {queryState === 'success' && halbjahre !== undefined ? (
        <HalbjahrList
          deletion={{
            error: deleteMutation.error,
            isError: deleteMutation.isError,
            isPending: deleteMutation.isPending,
            variables: deleteMutation.variables?.halbjahr.id,
          }}
          halbjahre={halbjahre}
          highlightId={editor.highlightId}
          looks={halbjahrLooks(halbjahre, today)}
          onDelete={(request) => {
            deleteMutation.reset();
            deleteMutation.mutate({
              ...request,
              focusOwnership: captureDeletionFocus(request.deletionTrigger),
            });
          }}
          onEdit={section.open}
          onHighlight={editor.setHighlightId}
          today={today}
        />
      ) : null}
    </section>
  );
};
