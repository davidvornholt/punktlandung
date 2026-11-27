import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { nbsp } from '#/shared/date/date-text.ts';
import { notensystemText } from '#/shared/noten/notensystem-text.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { faecherKey } from '#/shared/query/query-keys.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { EmptyState } from '#/shared/ui/empty-state.tsx';
import {
  primaryButtonClass,
  secondaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import { useFormFocus } from '#/shared/ui/form-focus.ts';
import { buttonIconSize, iconStroke } from '#/shared/ui/icon.ts';
import { ListQueryHints } from '#/shared/ui/query-state.tsx';
import { determineQueryState } from '#/shared/ui/query-state-model.ts';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';
import type { FachFields } from '../schemas/fach-schema.ts';
import type { Fach } from '../services/fach-service.ts';
import { FachForm } from './fach-form.tsx';
import { FachList } from './fach-list.tsx';
import { fachMutationOptions } from './fach-mutations.ts';
import type { FachOperations } from './fach-operations.ts';

type EditTarget = Fach | 'create' | null;

const editKey = (editTarget: EditTarget) => {
  if (editTarget === null || editTarget === 'create') {
    return editTarget;
  }
  return editTarget.id;
};

type FormMutation<Values> = {
  readonly error: unknown;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly mutate: (values: Values) => void;
  readonly reset: () => void;
};

type FormMutations = {
  readonly create: FormMutation<FachFields>;
  readonly update: FormMutation<FachFields & { readonly id: string }>;
};

const fachFormError = ({ create, update }: FormMutations): string | null => {
  if (create.isError) {
    return actionErrorText(
      create.error,
      'Das Fach konnte nicht angelegt werden. Prüfe die Verbindung und versuche es erneut.',
    );
  }
  if (update.isError) {
    return actionErrorText(
      update.error,
      'Das Fach konnte nicht geändert werden. Die Eingaben bleiben erhalten; versuche es erneut.',
    );
  }
  return null;
};

const faecherCountText = (count: number): string =>
  count === 1 ? '1 Fach' : `${count} Fächer`;

/**
 * "Fach anlegen" stands in the empty page until the first Fach is there and
 * in the head of the list from then on. When the button that leaves has the
 * keyboard focus, the one that takes its place in the same step gets it, so
 * saving the first Fach does not drop the focus.
 */
const CreateButton = ({
  buttonRef,
  handover,
  onClick,
  primary,
}: {
  readonly buttonRef: RefObject<HTMLButtonElement | null>;
  /** Whether the button that just left had the keyboard focus. */
  readonly handover: RefObject<boolean>;
  readonly onClick: (trigger: HTMLButtonElement) => void;
  /** The one action of an empty page is drawn as such. */
  readonly primary: boolean;
}) => {
  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (handover.current) {
      button?.focus();
    }
    return () => {
      handover.current = document.activeElement === button;
      // Only a button that appears in the same step takes the focus over.
      queueMicrotask(() => {
        handover.current = false;
      });
    };
  }, [buttonRef, handover]);
  return (
    <button
      className={primary ? primaryButtonClass : secondaryButtonClass}
      onClick={(event) => onClick(event.currentTarget)}
      ref={buttonRef}
      type="button"
    >
      <Plus aria-hidden={true} size={buttonIconSize} strokeWidth={iconStroke} />
      Fach anlegen
    </button>
  );
};

/** The form for a new Fach or for the one being changed. */
const Editor = ({
  editTarget,
  formRef,
  mutations,
  onClose,
  schoolYear,
  system,
}: {
  readonly editTarget: Fach | 'create';
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly mutations: FormMutations;
  readonly onClose: () => void;
  readonly schoolYear: string;
  readonly system: Notensystem;
}) => (
  <FachForm
    error={fachFormError(mutations)}
    fach={editTarget === 'create' ? null : editTarget}
    formRef={formRef}
    onCancel={onClose}
    onSave={(values) => {
      if (editTarget === 'create') {
        mutations.create.reset();
        mutations.create.mutate(values);
      } else {
        mutations.update.reset();
        mutations.update.mutate({ ...values, id: editTarget.id });
      }
    }}
    pending={mutations.create.isPending || mutations.update.isPending}
    scope={`Gilt für das Schuljahr ${schoolYear}.`}
    system={system}
    title={
      editTarget === 'create' ? 'Neues Fach' : `${editTarget.name} bearbeiten`
    }
  />
);

const SectionHead = ({
  children,
  count,
  schoolYear,
  system,
}: {
  /** The action at the right end. */
  readonly children: ReactNode;
  /** `null` while the Fächer are not there to be counted. */
  readonly count: number | null;
  readonly schoolYear: string;
  readonly system: Notensystem;
}) => (
  <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-3">
    <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-0.5">
      <h2 className="font-bold text-2xl">Schuljahr {schoolYear}</h2>
      <p className="text-ink-soft text-sm">
        {count === null
          ? notensystemText(system)
          : `${faecherCountText(count)} · ${notensystemText(system)}`}
      </p>
    </div>
    {children}
  </div>
);

/**
 * Die Fächer eines Schuljahrs. Die Seite setzt die Verwaltung für jedes
 * Schuljahr neu auf (`key`), damit ein offenes Formular und laufende
 * Rückmeldungen nicht in ein anderes Schuljahr mitwandern.
 */
export const FaecherManagement = ({
  operations,
  schoolYear,
  system,
}: {
  readonly operations: FachOperations;
  readonly schoolYear: string;
  /** Das Notensystem, in dem die Halbjahre des Schuljahrs rechnen. */
  readonly system: Notensystem;
}) => {
  const queryClient = useQueryClient();
  const faecherQuery = useQuery({
    queryFn: () => operations.list(schoolYear),
    queryKey: faecherKey(schoolYear),
  });
  const sectionRef = useRef<HTMLElement>(null);
  const createFocusHandoverRef = useRef(false);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const formKey = editKey(editTarget);
  const focus = useFormFocus(formKey);

  const mutationOptions = fachMutationOptions({
    onEditorClose: () => setEditTarget(null),
    operations,
    queryClient,
    schoolYear,
  });
  const mutations = {
    create: useMutation(mutationOptions.create),
    update: useMutation(mutationOptions.update),
  };
  const archiveMutation = useMutation(mutationOptions.archive);
  const queryState = determineQueryState({
    data: faecherQuery.data,
    isError: faecherQuery.isError,
    isPending: faecherQuery.isPending,
    isEmpty: (values) => values.length === 0,
  });
  const faecher = queryState === 'success' ? faecherQuery.data : undefined;
  const isEmpty = queryState === 'empty' && editTarget === null;
  const saving = mutations.create.isPending || mutations.update.isPending;

  const edit = (target: Fach | 'create', trigger: HTMLButtonElement) => {
    focus.rememberTrigger(trigger);
    mutations.create.reset();
    mutations.update.reset();
    setEditTarget(target);
  };
  const createButton = (
    <CreateButton
      buttonRef={focus.fallbackTriggerRef}
      handover={createFocusHandoverRef}
      onClick={(trigger) => edit('create', trigger)}
      primary={isEmpty}
    />
  );
  const form =
    editTarget === null ? null : (
      <Editor
        editTarget={editTarget}
        formRef={focus.formRef}
        key={formKey}
        mutations={mutations}
        onClose={() => setEditTarget(null)}
        schoolYear={schoolYear}
        system={system}
      />
    );
  // Ein Fach wird in seiner Zeile geändert. Steht die Zeile nicht da, etwa
  // weil das Fach inzwischen in einem anderen Tab archiviert wurde, bleibt
  // das Formular mit den Eingaben über der Liste stehen.
  const editedId = faecher?.find((fach) => fach.id === formKey)?.id;

  return (
    <section
      aria-label="Fächer"
      className="border-line border-t pt-6"
      ref={sectionRef}
      tabIndex={-1}
    >
      <SectionHead
        count={faecher?.length ?? null}
        schoolYear={schoolYear}
        system={system}
      >
        {editTarget === null && !isEmpty ? createButton : null}
      </SectionHead>
      {editedId === undefined && form !== null ? (
        <div className="mt-5">{form}</div>
      ) : null}
      <ListQueryHints
        errorText="Die Fächer konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
        isError={faecherQuery.isError}
        onRetry={retryWithFocus(() => faecherQuery.refetch(), sectionRef)}
        pendingText="Fächer werden geladen …"
        refreshErrorText="Die Fächer konnten nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut."
        state={queryState}
      />
      {faecher === undefined ? null : (
        <div className="mt-3">
          <FachList
            archiveMutation={archiveMutation}
            editor={editedId === undefined ? undefined : { id: editedId, form }}
            faecher={faecher}
            onArchive={(id) => {
              archiveMutation.reset();
              archiveMutation.mutate(id);
            }}
            onEdit={(fach, trigger) => {
              // Der Stift schließt das Formular, das er geöffnet hat, wie
              // „Abbrechen“ und wie dieses nicht, während gespeichert wird.
              if (fach.id !== formKey) {
                edit(fach, trigger);
              } else if (!saving) {
                setEditTarget(null);
              }
            }}
          />
        </div>
      )}
      {isEmpty ? (
        <div className="mt-5">
          <EmptyState
            text="Lege dein erstes Fach an, mit der Gewichtung, die die Lehrkraft zu Schuljahresbeginn verkündet hat. Danach kannst du Noten in diesem Fach eintragen."
            title={`Noch keine Fächer im Schuljahr${nbsp}${schoolYear}`}
          >
            {createButton}
          </EmptyState>
        </div>
      ) : null}
    </section>
  );
};
