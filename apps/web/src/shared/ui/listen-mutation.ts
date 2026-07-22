export type ListenMutation<Ziel> = {
  readonly error: unknown;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly variables: Ziel | undefined;
};

/** Leitet den Zustand einer Zeile aus einer gemeinsam genutzten Mutation ab. */
export const listenMutationsanzeige = <Ziel>(
  mutation: ListenMutation<Ziel>,
  ziel: Ziel,
) => {
  const istZiel = mutation.variables === ziel;
  return {
    fehler: mutation.isError && istZiel ? mutation.error : null,
    gesperrt: mutation.isPending,
    laeuft: mutation.isPending && istZiel,
  };
};
