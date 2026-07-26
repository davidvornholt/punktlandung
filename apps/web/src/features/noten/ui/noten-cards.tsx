import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { fachAverage } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { quietButtonClass } from '#/shared/ui/form-classes.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import type { NoteWithFach } from '../services/noten-service.ts';
import {
  leistungsartLabel,
  wertungsbereichLabel,
} from './leistungsart-label.ts';

type FachGroup = {
  readonly fachId: string;
  readonly fachName: string;
  readonly noten: ReadonlyArray<NoteWithFach>;
  readonly average: number | null;
};

const groupByFach = (
  noten: ReadonlyArray<NoteWithFach>,
): ReadonlyArray<FachGroup> => {
  const groups = new Map<
    string,
    { readonly first: NoteWithFach; readonly noten: Array<NoteWithFach> }
  >();
  for (const note of noten) {
    const group = groups.get(note.fachId);
    if (group === undefined) {
      groups.set(note.fachId, { first: note, noten: [note] });
    } else {
      group.noten.push(note);
    }
  }
  return [...groups.values()].map(({ first, noten: list }) => ({
    fachId: first.fachId,
    fachName: first.fachName,
    noten: list,
    average: fachAverage(
      list.map((note) => ({
        notenwert: note.notenwert,
        individualGewichtung: note.individualGewichtung,
        leistungsart: note.leistungsart,
        wertungsbereich: note.wertungsbereich,
      })),
      first.fachGewichtung,
    ),
  }));
};

const formatDisplayDate = (iso: string): string => {
  const [year, month, tag] = iso.split('-');
  return `${tag}.${month}.${year}`;
};

/** Notenkarten: je Fach die Einzelnoten und der gewichtete Fachschnitt. */
export const NotenCards = ({
  deleteMutation,
  noten,
  onDelete,
  notensystem,
}: {
  readonly deleteMutation: ListMutation<string>;
  readonly noten: ReadonlyArray<NoteWithFach>;
  readonly onDelete: (id: string) => void;
  readonly notensystem: Notensystem;
}) => (
  <div className="mt-6 space-y-4">
    {groupByFach(noten).map((group) => (
      <section
        aria-label={group.fachName}
        className="border border-border bg-surface p-4 shadow-card"
        key={group.fachId}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-ink text-xl tracking-tight">
            {group.fachName}
          </h3>
          <p className="font-display text-3xl text-ink tracking-tight">
            {group.average === null
              ? '—'
              : formatNote(group.average, notensystem)}
            <span className="ml-2 text-ink-faint text-xs uppercase tracking-widest">
              Schnitt
            </span>
          </p>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {group.noten.map((note) => {
            const display = listMutationState(deleteMutation, note.id);
            return (
              <li
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2"
                key={note.id}
              >
                <span className="font-display text-ink text-lg">
                  {formatNote(note.notenwert, notensystem)}
                </span>
                <span className="text-ink-muted text-sm">
                  {leistungsartLabel[note.leistungsart]} ·{' '}
                  {wertungsbereichLabel[note.wertungsbereich]}
                  {note.individualGewichtung === 1
                    ? ''
                    : ` · Gewicht ${note.individualGewichtung}`}
                </span>
                <span className="text-ink-faint text-sm">
                  {formatDisplayDate(note.date)}
                </span>
                {note.comment === null ? null : (
                  <span className="text-ink-faint text-sm">{note.comment}</span>
                )}
                <button
                  className={`${quietButtonClass} ml-auto`}
                  disabled={display.disabled}
                  onClick={() => onDelete(note.id)}
                  type="button"
                >
                  {display.pending ? 'Wird gelöscht …' : 'Löschen'}
                </button>
                {display.error === null ? null : (
                  <p
                    className="basis-full border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
                    role="alert"
                  >
                    {actionErrorText(
                      display.error,
                      'Die Note konnte nicht gelöscht werden. Sie bleibt in der Liste; versuche es erneut.',
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    ))}
  </div>
);
