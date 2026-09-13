import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import type { PlanbareLeistungsart } from '#/shared/noten/notenwert.ts';
import { planbareLeistungsarten } from '#/shared/noten/notenwert.ts';
import { preparationTemplatesKey } from '#/shared/query/query-keys.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import {
  inputClass,
  labelClass,
  primaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { preparationLimits } from '../schemas/note-schema.ts';
import type { LeistungOperations } from './leistung-operations.ts';

const TemplateForm = ({
  content,
  kind,
  operations,
}: {
  readonly content: string;
  readonly kind: PlanbareLeistungsart;
  readonly operations: LeistungOperations;
}) => {
  const queryClient = useQueryClient();
  const fieldId = useId();
  const saveMutation = useMutation({
    mutationFn: (next: string) =>
      operations.saveTemplate({ kind, content: next }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: preparationTemplatesKey }),
  });
  return (
    <form
      aria-label={`Vorlage ${leistungsartLabel[kind]}`}
      onSubmit={(event) => {
        event.preventDefault();
        saveMutation.reset();
        saveMutation.mutate(
          `${new FormData(event.currentTarget).get('content') ?? ''}`,
        );
      }}
    >
      <label className={labelClass} htmlFor={fieldId}>
        {leistungsartLabel[kind]}
      </label>
      <textarea
        className={`${inputClass} min-h-40 font-mono text-sm`}
        defaultValue={content}
        id={fieldId}
        maxLength={preparationLimits.maxLength}
        name="content"
      />
      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <button
          className={primaryButtonClass}
          disabled={saveMutation.isPending}
          type="submit"
        >
          {saveMutation.isPending ? 'Wird gespeichert …' : 'Vorlage speichern'}
        </button>
        {saveMutation.isSuccess ? (
          <p className="text-ink-muted text-sm" role="status">
            Gespeichert.
          </p>
        ) : null}
      </div>
      {saveMutation.isError ? (
        <p
          className="mt-3 border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
          role="alert"
        >
          {actionErrorText(
            saveMutation.error,
            'Die Vorlage konnte nicht gespeichert werden. Der Text bleibt erhalten; prüfe die Verbindung und versuche es erneut.',
          )}
        </p>
      ) : null}
    </form>
  );
};

/**
 * Die Vorlagen, mit denen eine neue Vorbereitung beginnt, je planbarer
 * Leistungsart. Eine Art zur Zeit — die drei Texte gleichen sich meist, und
 * drei Textfelder untereinander verlangten dreimal Scrollen für einen Blick.
 */
export const PreparationTemplateSettings = ({
  operations,
}: {
  readonly operations: LeistungOperations;
}) => {
  const templatesQuery = useQuery({
    queryFn: () => operations.loadTemplates(),
    queryKey: preparationTemplatesKey,
  });
  const [kind, setKind] = useState<PlanbareLeistungsart>('klausur');
  const headingId = useId();
  const selectId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h2
        className="font-display text-2xl text-ink tracking-tight"
        id={headingId}
      >
        Vorlage für die Vorbereitung
      </h2>
      <p className="mt-2 text-ink-muted">
        Damit beginnt die Vorbereitung einer neuen Klausur, eines Tests oder
        einer GFS. Markdown; jede Zeile <code>- [ ] Thema</code> zählt als
        Thema.
      </p>
      <div className="mt-4 border border-border bg-surface p-4 shadow-card">
        <label className={labelClass} htmlFor={selectId}>
          Leistungsart
        </label>
        <select
          className={`${inputClass} max-w-xs`}
          id={selectId}
          onChange={(event) =>
            setKind(event.target.value as PlanbareLeistungsart)
          }
          value={kind}
        >
          {planbareLeistungsarten.map((option) => (
            <option key={option} value={option}>
              {leistungsartLabel[option]}
            </option>
          ))}
        </select>
        <div className="mt-4">
          {templatesQuery.isPending ? (
            <LoadingHint text="Vorlagen werden geladen …" />
          ) : null}
          {templatesQuery.isError ? (
            <QueryError
              onRetry={() => templatesQuery.refetch()}
              text="Die Vorlagen konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
            />
          ) : null}
          {templatesQuery.data === undefined ? null : (
            /* Der Schlüssel setzt das Textfeld auf die gewählte Art zurück. */
            <TemplateForm
              content={templatesQuery.data[kind]}
              key={kind}
              kind={kind}
              operations={operations}
            />
          )}
        </div>
      </div>
    </section>
  );
};
