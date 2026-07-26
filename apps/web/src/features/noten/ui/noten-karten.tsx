import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { fachschnitt } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import { quietButtonClass } from '#/shared/ui/form-classes.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import { listMutationState } from '#/shared/ui/list-mutation.ts';
import type { NoteMitFach } from '../services/noten-service.ts';
import { bereichLabel, leistungsartLabel } from './leistungsart-label.ts';

type FachGruppe = {
  readonly fachId: string;
  readonly fachName: string;
  readonly noten: ReadonlyArray<NoteMitFach>;
  readonly schnitt: number | null;
};

const gruppiereNachFach = (
  noten: ReadonlyArray<NoteMitFach>,
): ReadonlyArray<FachGruppe> => {
  const gruppen = new Map<
    string,
    { readonly erste: NoteMitFach; readonly noten: Array<NoteMitFach> }
  >();
  for (const note of noten) {
    const gruppe = gruppen.get(note.fachId);
    if (gruppe === undefined) {
      gruppen.set(note.fachId, { erste: note, noten: [note] });
    } else {
      gruppe.noten.push(note);
    }
  }
  return [...gruppen.values()].map(({ erste, noten: liste }) => ({
    fachId: erste.fachId,
    fachName: erste.fachName,
    noten: liste,
    schnitt: fachschnitt(
      liste.map((note) => ({
        value: note.wert,
        weight: note.gewicht,
        kind: note.kind,
        area: note.area,
      })),
      erste.gewichtung,
    ),
  }));
};

const datumAnzeige = (iso: string): string => {
  const [jahr, monat, tag] = iso.split('-');
  return `${tag}.${monat}.${jahr}`;
};

/** Notenkarten: je Fach die Einzelnoten und der gewichtete Fachschnitt. */
export const NotenKarten = ({
  loeschung,
  noten,
  onLoeschen,
  system,
}: {
  readonly loeschung: ListMutation<string>;
  readonly noten: ReadonlyArray<NoteMitFach>;
  readonly onLoeschen: (id: string) => void;
  readonly system: Notensystem;
}) => (
  <div className="mt-6 space-y-4">
    {gruppiereNachFach(noten).map((gruppe) => (
      <section
        aria-label={gruppe.fachName}
        className="border border-border bg-surface p-4 shadow-card"
        key={gruppe.fachId}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-ink text-xl tracking-tight">
            {gruppe.fachName}
          </h3>
          <p className="font-display text-3xl text-ink tracking-tight">
            {gruppe.schnitt === null ? '—' : formatNote(gruppe.schnitt, system)}
            <span className="ml-2 text-ink-faint text-xs uppercase tracking-widest">
              Schnitt
            </span>
          </p>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {gruppe.noten.map((note) => {
            const anzeige = listMutationState(loeschung, note.id);
            return (
              <li
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2"
                key={note.id}
              >
                <span className="font-display text-ink text-lg">
                  {formatNote(note.wert, system)}
                </span>
                <span className="text-ink-muted text-sm">
                  {leistungsartLabel[note.kind]} · {bereichLabel[note.area]}
                  {note.gewicht === 1 ? '' : ` · Gewicht ${note.gewicht}`}
                </span>
                <span className="text-ink-faint text-sm">
                  {datumAnzeige(note.datum)}
                </span>
                {note.notiz === null ? null : (
                  <span className="text-ink-faint text-sm">{note.notiz}</span>
                )}
                <button
                  className={`${quietButtonClass} ml-auto`}
                  disabled={anzeige.disabled}
                  onClick={() => onLoeschen(note.id)}
                  type="button"
                >
                  {anzeige.pending ? 'Wird gelöscht …' : 'Löschen'}
                </button>
                {anzeige.error === null ? null : (
                  <p
                    className="basis-full border border-critical bg-critical-subtle px-3 py-2 text-ink text-sm"
                    role="alert"
                  >
                    {actionErrorText(
                      anzeige.error,
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
