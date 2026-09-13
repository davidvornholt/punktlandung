import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useRef, useState } from 'react';

import { formatIsoDate } from '#/shared/date/calendar-date.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import { isPlanbar } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { leistungKey } from '#/shared/query/query-keys.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { quietButtonClass } from '#/shared/ui/form-classes.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import type { NotenFields } from '../schemas/note-schema.ts';
import type { LeistungDetail as Detail } from '../services/noten-service.ts';
import type { LeistungOperations } from './leistung-operations.ts';
import { NoteForm } from './note-form.tsx';
import { invalidateNotenQueries } from './noten-invalidation.ts';
import type { NotenOperations } from './noten-operations.ts';
import { PreparationPanel } from './preparation-panel.tsx';

type FachList = ReadonlyArray<{
  readonly id: string;
  readonly name: string;
}>;

const Heading = ({ text }: { readonly text: string }) => (
  <h1 className="font-display text-3xl text-ink tracking-tight">{text}</h1>
);

/** Die Kopfzeile: Wert oder „ausstehend", Art, Termin, Halbjahr. */
const Facts = ({ detail }: { readonly detail: Detail }) => {
  const { halbjahr, leistung } = detail;
  return (
    <dl className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
      <div>
        <dt className="sr-only">
          {leistung.status === 'graded' ? 'Note' : 'Stand'}
        </dt>
        <dd className="font-display text-4xl text-ink tracking-tight">
          {leistung.status === 'graded'
            ? formatNote(leistung.wert, halbjahr.system)
            : 'ausstehend'}
        </dd>
      </div>
      <div>
        <dt className="sr-only">Termin</dt>
        <dd className="text-ink-muted">
          {leistungsartLabel[leistung.kind]} · {formatIsoDate(leistung.datum)}
          {leistung.gewicht === 1 ? '' : ` · Gewicht ${leistung.gewicht}`}
        </dd>
      </div>
      <div>
        <dt className="sr-only">Halbjahr</dt>
        <dd className="text-ink-faint">
          {halbjahr.label} · {halbjahr.schoolYear}
        </dd>
      </div>
      {leistung.notiz === null ? null : (
        <div className="basis-full">
          <dt className="sr-only">Notiz</dt>
          <dd className="text-ink-muted">{leistung.notiz}</dd>
        </div>
      )}
    </dl>
  );
};

/**
 * Die Seite einer Leistung: die Fakten, auf Wunsch das Notenformular — hier
 * wird eine ausstehende Klausur zur Note — und darunter die Vorbereitung.
 */
export const LeistungDetail = ({
  faecher,
  leistungId,
  leistungOperations,
  notenOperations,
}: {
  /** Der wählbare Fachstand des Schuljahrs; null, solange er lädt. */
  readonly faecher: FachList | null;
  readonly leistungId: string;
  readonly leistungOperations: LeistungOperations;
  readonly notenOperations: NotenOperations;
}) => {
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryFn: () => leistungOperations.load(leistungId),
    queryKey: leistungKey(leistungId),
  });
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const updateMutation = useMutation({
    mutationFn: (values: NotenFields) =>
      notenOperations.update({ ...values, id: leistungId }),
    onSuccess: async () => {
      const termId = detailQuery.data?.halbjahr.id;
      if (termId !== undefined) {
        await invalidateNotenQueries(queryClient, termId);
      }
      setEditing(false);
    },
  });

  if (detailQuery.isPending) {
    return (
      <>
        <Heading text="Leistung" />
        <div className="mt-6">
          <LoadingHint text="Leistung wird geladen …" />
        </div>
      </>
    );
  }
  if (detailQuery.isError) {
    return (
      <>
        <Heading text="Leistung" />
        <div className="mt-6">
          <QueryError
            onRetry={() => detailQuery.refetch()}
            text={actionErrorText(
              detailQuery.error,
              'Die Leistung konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut.',
            )}
          />
        </div>
      </>
    );
  }
  const detail = detailQuery.data;
  const { halbjahr, leistung } = detail;

  return (
    <>
      <p className="text-ink-muted text-sm">
        <Link className="underline underline-offset-4" to="/noten">
          Noten
        </Link>
        <span> / {leistung.fachName}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <Heading
          text={`${leistungsartLabel[leistung.kind]} ${leistung.fachName}`}
        />
        {editing ? null : (
          <button
            className={quietButtonClass}
            onClick={() => setEditing(true)}
            type="button"
          >
            {leistung.status === 'graded' ? 'Bearbeiten' : 'Note eintragen'}
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-4">
          {faecher === null ? (
            <LoadingHint text="Fächer werden geladen …" />
          ) : (
            <NoteForm
              error={
                updateMutation.isError
                  ? actionErrorText(
                      updateMutation.error,
                      'Die Note konnte nicht geändert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
                    )
                  : null
              }
              faecher={faecher}
              formRef={formRef}
              halbjahr={halbjahr}
              note={leistung}
              onCancel={() => {
                updateMutation.reset();
                setEditing(false);
              }}
              onSave={(values) => {
                updateMutation.reset();
                updateMutation.mutate(values);
              }}
              pending={updateMutation.isPending}
            />
          )}
        </div>
      ) : (
        <Facts detail={detail} />
      )}
      {isPlanbar(leistung.kind) ? (
        <PreparationPanel
          halbjahrId={halbjahr.id}
          kind={leistung.kind}
          leistungId={leistung.id}
          operations={leistungOperations}
          preparation={leistung.preparation}
        />
      ) : null}
    </>
  );
};
