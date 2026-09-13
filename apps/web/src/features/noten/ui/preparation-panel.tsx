import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  quietButtonClass,
  secondaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import { LoadingHint } from '#/shared/ui/query-state.tsx';
import { preparationLimits } from '../schemas/note-schema.ts';
import type { PreparationTemplates } from '../services/preparation-template-service.ts';
import type { LeistungOperations } from './leistung-operations.ts';
import { topicsText } from './preparation-text.ts';
import { ThemenMarkdown } from './themen-markdown.tsx';

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
  markdown,
  onEdit,
  onToggle,
  pending,
}: {
  readonly markdown: string;
  readonly onEdit: () => void;
  readonly onToggle: (line: number) => void;
  readonly pending: boolean;
}) => (
  <>
    <ThemenMarkdown markdown={markdown} onToggle={onToggle} pending={pending} />
    <div className="mt-4 flex justify-end">
      <button
        className={quietButtonClass}
        disabled={pending}
        onClick={onEdit}
        type="button"
      >
        Text bearbeiten
      </button>
    </div>
  </>
);

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
  preparation,
}: {
  readonly halbjahrId: string;
  readonly kind: PlanbareLeistungsart;
  readonly leistungId: string;
  readonly operations: LeistungOperations;
  readonly preparation: string | null;
}) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const templatesQuery = useQuery({
    enabled: editing && preparation === null,
    queryFn: () => operations.loadTemplates(),
    queryKey: preparationTemplatesKey,
  });
  const saveMutation = useMutation({
    mutationFn: (markdown: string | null) =>
      operations.updatePreparation({ id: leistungId, preparation: markdown }),
    onSuccess: async () => {
      await invalidateAll(queryClient, [
        leistungKey(leistungId),
        notenKey(halbjahrId),
        upcomingKey,
      ]);
      setEditing(false);
    },
  });
  const error = saveMutation.isError
    ? actionErrorText(saveMutation.error, saveErrorText)
    : null;
  const headingId = useId();

  const templateFor = (templates: PreparationTemplates) => templates[kind];
  const startEditing = () => setEditing(true);

  const body = () => {
    if (!editing) {
      return preparation === null ? (
        <EmptyPreparation onStart={startEditing} />
      ) : (
        <RenderedPreparation
          markdown={preparation}
          onEdit={startEditing}
          onToggle={(line) => {
            saveMutation.reset();
            saveMutation.mutate(toggleTaskLine(preparation, line));
          }}
          pending={saveMutation.isPending}
        />
      );
    }
    if (preparation === null && templatesQuery.data === undefined) {
      return <LoadingHint text="Vorlage wird geladen …" />;
    }
    return (
      <PreparationEditor
        initial={
          preparation ??
          (templatesQuery.data === undefined
            ? ''
            : templateFor(templatesQuery.data))
        }
        onCancel={() => {
          saveMutation.reset();
          setEditing(false);
        }}
        onSave={(markdown) => {
          saveMutation.reset();
          saveMutation.mutate(markdown.trim() === '' ? null : markdown);
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
