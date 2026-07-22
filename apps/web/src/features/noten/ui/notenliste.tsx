import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { AbfrageFehler, Ladehinweis } from '#/shared/ui/abfrage-zustand.tsx';
import { deleteNoteFn, notenQueryOptions } from '../server/noten-fns.ts';
import { NotenKarten } from './noten-karten.tsx';

export const Notenliste = ({
  term,
}: {
  readonly term: { readonly id: string; readonly system: Notensystem };
}) => {
  const queryClient = useQueryClient();
  const notenAbfrage = useQuery(notenQueryOptions(term.id));
  const loeschen = useMutation({
    mutationFn: (id: string) => deleteNoteFn({ data: { id } }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['noten', term.id] }),
        queryClient.invalidateQueries({ queryKey: ['verlauf'] }),
      ]),
  });

  const noten = notenAbfrage.data;
  if (notenAbfrage.isPending) {
    return (
      <div className="mt-6">
        <Ladehinweis text="Notenliste wird geladen …" />
      </div>
    );
  }
  if (notenAbfrage.isError || noten === undefined) {
    return (
      <div className="mt-6">
        <AbfrageFehler
          onWiederholen={() => notenAbfrage.refetch()}
          text="Die Notenliste konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
        />
      </div>
    );
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
    <NotenKarten
      loeschung={loeschen}
      noten={noten}
      onLoeschen={(id) => {
        loeschen.reset();
        loeschen.mutate(id);
      }}
      system={term.system}
    />
  );
};
