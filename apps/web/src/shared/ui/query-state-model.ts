export type QueryState = 'pending' | 'error' | 'empty' | 'success';

export const determineQueryState = <T>({
  data,
  isError,
  isPending,
  isEmpty,
}: {
  readonly data: T | undefined;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly isEmpty: (value: T) => boolean;
}): QueryState => {
  if (isPending) {
    return 'pending';
  }
  if (isError) {
    return 'error';
  }
  if (data === undefined || isEmpty(data)) {
    return 'empty';
  }
  return 'success';
};
