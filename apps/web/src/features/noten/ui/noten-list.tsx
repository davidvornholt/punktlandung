import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { deleteNoteFn, notenQueryOptions } from '../server/noten-fns.ts';
import { NotenCards } from './noten-cards.tsx';

export const NotenList = ({
  halbjahr,
}: {
  readonly halbjahr: { readonly id: string; readonly notensystem: Notensystem };
}) => {
  const queryClient = useQueryClient();
  const notenQuery = useQuery(notenQueryOptions(halbjahr.id));
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNoteFn({ data: { id } }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['noten', halbjahr.id] }),
        queryClient.invalidateQueries({ queryKey: ['trend'] }),
      ]),
  });

  const noten = notenQuery.data;
  if (notenQuery.isPending) {
    return (
      <div className="mt-6">
        <LoadingHint text="Notenliste wird geladen …" />
      </div>
    );
  }
  if (notenQuery.isError || noten === undefined) {
    return (
      <div className="mt-6">
        <QueryError
          onRetry={() => notenQuery.refetch()}
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
    <NotenCards
      deleteMutation={deleteMutation}
      noten={noten}
      onDelete={(id) => {
        deleteMutation.reset();
        deleteMutation.mutate(id);
      }}
      notensystem={halbjahr.notensystem}
    />
  );
};
