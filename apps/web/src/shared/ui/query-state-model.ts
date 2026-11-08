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
  // Scheitert ein Neuladen im Hintergrund, behält die Abfrage ihre Daten. Dann
  // bleibt der zuletzt geladene Stand stehen, und der Fehler erscheint als
  // Hinweis darüber statt an seiner Stelle.
  if (isError && data === undefined) {
    return 'error';
  }
  if (data === undefined || isEmpty(data)) {
    return 'empty';
  }
  return 'success';
};
