import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useId, useState } from 'react';

import { toggleTaskLine, topicProgress } from '#/shared/markdown/task-lines.ts';
import type { PlanbareLeistungsart } from '#/shared/noten/notenwert.ts';
import { invalidateAll } from '#/shared/query/query-invalidation.ts';
import {
  leistungKey,
  notenKey,
  preparationTemplatesKey,
  upcomingKey,
} from '#/shared/query/query-keys.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import { IconButton } from '#/shared/ui/icon-button.tsx';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { preparationLimits } from '../schemas/note-schema.ts';
import type { LeistungDetail } from '../services/noten-service.ts';
import type { PreparationTemplates } from '../services/preparation-template-service.ts';
import type { LeistungOperations } from './leistung-operations.ts';
import { topicsText } from './preparation-text.ts';
import { ThemenMarkdown } from './themen-markdown.tsx';

const preparationSaveKey = (leistungId: string) =>
  ['preparation-save', leistungId] as const;

type PreparationSave = {
  readonly expected: string | null;
  readonly preparation: string | null;
};

/** Der Stand, auf dem der offene Editor beruht; null, solange keiner offen ist. */
type EditorBase = { readonly expected: string | null } | null;

const templateErrorText =
  'Die Vorlage konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut.';

const saveErrorText =
  'Die Vorbereitung konnte nicht gespeichert werden. Der Text bleibt erhalten; prüfe die Verbindung und versuche es erneut.';

/** Das Textfeld mit dem rohen Markdown. */
const PreparationEditor = ({
  initial,
  onCancel,
  onSave,
  pending,
}: {
  readonly initial: string;
  readonly onCancel: () => void;
  readonly onSave: (markdown: string) => void;
  readonly pending: boolean;
}) => {
  const fieldId = useId();
  return (
    <form
      aria-label="Vorbereitung bearbeiten"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSave(`${data.get('preparation') ?? ''}`);
      }}
    >
      <label className="sr-only" htmlFor={fieldId}>
        Vorbereitung als Markdown
      </label>
      <textarea
        className={`${inputClass} min-h-64 font-mono text-sm`}
        defaultValue={initial}
        id={fieldId}
        maxLength={preparationLimits.maxLength}
        name="preparation"
        spellCheck={true}
      />
      <p className="mt-2 text-ink-muted text-sm">
        Markdown. Jede Zeile <code>- [ ] Thema</code> ist ein Thema; abgehakt
        heißt „kann ich", nicht „erledigt".
      </p>
      <div className="mt-3 flex gap-3">
        <button className={primaryButtonClass} disabled={pending} type="submit">
          {pending ? 'Wird gespeichert …' : 'Speichern'}
        </button>
        <button
          className={secondaryButtonClass}
          disabled={pending}
          onClick={onCancel}
          type="button"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
};

/** Die Vorlage für eine neue Vorbereitung kam nicht an. */
const TemplateError = ({
  onCancel,
  onRetry,
}: {
  readonly onCancel: () => void;
  readonly onRetry: () => unknown;
}) => (
  <>
    <QueryError onRetry={onRetry} text={templateErrorText} />
    <button
      className={`${secondaryButtonClass} mt-3`}
      onClick={onCancel}
      type="button"
    >
      Abbrechen
    </button>
  </>
);

/** Die Aufforderung, solange keine Vorbereitung angelegt ist. */
const EmptyPreparation = ({ onStart }: { readonly onStart: () => void }) => (
  <>
    <p className="text-ink">Noch keine Vorbereitung.</p>
    <p className="mt-2 text-ink-muted">
      Lege fest, welche Themen du bis zum Termin können willst. Die Liste
      beginnt mit deiner Vorlage aus den Einstellungen.
    </p>
    <button
      className={`${primaryButtonClass} mt-4`}
      onClick={onStart}
      type="button"
    >
      Vorbereitung anlegen
    </button>
  </>
);

/** Die gerenderte Themenliste mit dem Sprung in den rohen Text. */
const RenderedPreparation = ({
  editable,
  markdown,
  onEdit,
  onToggle,
}: {
  readonly editable: boolean;
  readonly markdown: string;
  readonly onEdit: () => void;
  readonly onToggle: (line: number) => void;
}) => (
  <>
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <ThemenMarkdown markdown={markdown} onToggle={onToggle} />
      </div>
      <IconButton
        className="-mt-1 -mr-1"
        disabled={!editable}
        icon={Pencil}
        label="Text bearbeiten"
        onClick={onEdit}
      />
    </div>
  </>
);

/**
 * Speichert die Vorbereitung. Die Aufrufe einer Vorbereitung gehen
 * nacheinander hinaus, damit jeder auf dem Ergebnis des vorigen aufbaut.
 * Solange einer unterwegs ist, gilt sein Text als der angezeigte.
 */
const usePreparationSave = ({
  halbjahrId,
  leistungId,
  operations,
  savedPreparation,
}: {
  readonly halbjahrId: string;
  readonly leistungId: string;
  readonly operations: LeistungOperations;
  readonly savedPreparation: string | null;
}) => {
  const queryClient = useQueryClient();
  const saveKey = preparationSaveKey(leistungId);
  const pendingPreparations = useMutationState({
    filters: { mutationKey: saveKey, status: 'pending' },
    select: (mutation) =>
      (mutation.state.variables as PreparationSave).preparation,
  });
  const pendingPreparation = pendingPreparations.at(-1);
  const saveMutation = useMutation({
    mutationKey: saveKey,
    scope: { id: saveKey.join(':') },
    mutationFn: (save: PreparationSave) =>
      operations.updatePreparation({ id: leistungId, ...save }),
    onSuccess: async (_result, { preparation: markdown }) => {
      const key = leistungKey(leistungId);
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<LeistungDetail>(key, (previous) =>
        previous === undefined
          ? previous
          : {
              ...previous,
              leistung: { ...previous.leistung, preparation: markdown },
            },
      );
    },
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey: saveKey }) === 1) {
        await invalidateAll(queryClient, [
          leistungKey(leistungId),
          notenKey(halbjahrId),
          upcomingKey,
        ]);
      }
    },
  });
  return {
    preparation:
      pendingPreparation === undefined ? savedPreparation : pendingPreparation,
    saveMutation,
  };
};

/**
 * Die Vorbereitung einer Leistung: die gerenderte Themenliste mit
 * bedienbaren Kästchen, der Fortschritt darüber, und auf Wunsch der rohe
 * Text zum Bearbeiten. Ohne Vorbereitung beginnt das Bearbeiten mit der
 * Vorlage der Leistungsart.
 */
export const PreparationPanel = ({
  halbjahrId,
  kind,
  leistungId,
  operations,
  preparation: savedPreparation,
}: {
  readonly halbjahrId: string;
  readonly kind: PlanbareLeistungsart;
  readonly leistungId: string;
  readonly operations: LeistungOperations;
  readonly preparation: string | null;
}) => {
  const [editorBase, setEditorBase] = useState<EditorBase>(null);
  const editing = editorBase !== null;
  const { preparation, saveMutation } = usePreparationSave({
    halbjahrId,
    leistungId,
    operations,
    savedPreparation,
  });
  const templatesQuery = useQuery({
    enabled: editorBase?.expected === null,
    queryFn: () => operations.loadTemplates(),
    queryKey: preparationTemplatesKey,
  });
  const error = saveMutation.isError
    ? actionErrorText(saveMutation.error, saveErrorText)
    : null;
  const headingId = useId();

  const templateFor = (templates: PreparationTemplates) => templates[kind];
  // Der Editor beruht auf dem Stand beim Öffnen, nicht auf dem, den die Seite
  // währenddessen nachlädt: Der Entwurf darf einen neueren nicht ersetzen.
  const startEditing = () => setEditorBase({ expected: preparation });

  const body = () => {
    if (!editing) {
      return preparation === null ? (
        <EmptyPreparation onStart={startEditing} />
      ) : (
        <RenderedPreparation
          // Ein noch unbestätigter Haken taugt nicht als Stand des Editors:
          // Scheitert er, schlüge jedes Speichern des Entwurfs fehl.
          editable={!saveMutation.isPending}
          markdown={preparation}
          onEdit={startEditing}
          onToggle={(line) => {
            saveMutation.reset();
            saveMutation.mutate({
              expected: preparation,
              preparation: toggleTaskLine(preparation, line),
            });
          }}
        />
      );
    }
    if (editorBase.expected === null && templatesQuery.data === undefined) {
      return templatesQuery.isError && !templatesQuery.isFetching ? (
        <TemplateError
          onCancel={() => setEditorBase(null)}
          onRetry={() => templatesQuery.refetch()}
        />
      ) : (
        <LoadingHint text="Vorlage wird geladen …" />
      );
    }
    return (
      <PreparationEditor
        initial={
          editorBase.expected ??
          (templatesQuery.data === undefined
            ? ''
            : templateFor(templatesQuery.data))
        }
        onCancel={() => {
          saveMutation.reset();
          setEditorBase(null);
        }}
        onSave={(markdown) => {
          saveMutation.reset();
          saveMutation.mutate(
            {
              expected: editorBase.expected,
              preparation: markdown.trim() === '' ? null : markdown,
            },
            { onSuccess: () => setEditorBase(null) },
          );
        }}
        pending={saveMutation.isPending}
      />
    );
  };

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          className="font-display text-2xl text-ink tracking-tight"
          id={headingId}
        >
          Vorbereitung
        </h2>
        {preparation === null || editing ? null : (
          <p className="text-ink-muted text-sm">
            {topicsText(topicProgress(preparation))}
          </p>
        )}
      </div>
      <div className="mt-4 border border-border bg-surface p-4 shadow-card">
        {body()}
        {error === null ? null : (
          <p
            className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
};
