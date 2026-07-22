import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { fachschnitt } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { leiseKnopfKlasse } from '#/shared/ui/form-klassen.ts';
import { deleteNoteFn, notenQueryOptions } from '../server/noten-fns.ts';
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
export const Notenliste = ({
  term,
}: {
  readonly term: { readonly id: string; readonly system: Notensystem };
}) => {
  const queryClient = useQueryClient();
  const { data: noten } = useQuery(notenQueryOptions(term.id));
  const loeschen = useMutation({
    mutationFn: (id: string) => deleteNoteFn({ data: { id } }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['noten', term.id] }),
        queryClient.invalidateQueries({ queryKey: ['verlauf'] }),
      ]),
  });

  if (noten === undefined) {
    return <p className="mt-6 text-ink-muted">Noten werden geladen …</p>;
  }
  if (noten.length === 0) {
    return (
      <div className="mt-6 border border-border bg-surface-sunken p-6">
        <p className="text-ink-muted">
          In diesem Halbjahr sind noch keine Noten eingetragen. Nutze die
          Eintragsleiste oben, sobald die erste Note zurückkommt.
        </p>
      </div>
    );
  }

  return (
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
              {gruppe.schnitt === null
                ? '—'
                : formatNote(gruppe.schnitt, term.system)}
              <span className="ml-2 text-ink-faint text-xs uppercase tracking-widest">
                Schnitt
              </span>
            </p>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {gruppe.noten.map((note) => (
              <li
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2"
                key={note.id}
              >
                <span className="font-display text-ink text-lg">
                  {formatNote(note.wert, term.system)}
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
                  className={`${leiseKnopfKlasse} ml-auto`}
                  onClick={() => loeschen.mutate(note.id)}
                  type="button"
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
