export type ListMutation<Target> = {
  readonly error: unknown;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly variables: Target | undefined;
};

/** Leitet den Zustand einer Zeile aus einer gemeinsam genutzten Mutation ab. */
export const listMutationState = <Target>(
  mutation: ListMutation<Target>,
  target: Target,
) => {
  const isTarget = mutation.variables === target;
  return {
    error: mutation.isError && isTarget ? mutation.error : null,
    disabled: mutation.isPending,
    pending: mutation.isPending && isTarget,
  };
};
