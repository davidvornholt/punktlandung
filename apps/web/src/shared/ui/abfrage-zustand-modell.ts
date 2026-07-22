export type AbfrageZustand = 'ausstehend' | 'fehler' | 'leer' | 'erfolg';

export const bestimmeAbfrageZustand = <T>({
  data,
  isError,
  isPending,
  istLeer,
}: {
  readonly data: T | undefined;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly istLeer: (wert: T) => boolean;
}): AbfrageZustand => {
  if (isPending) {
    return 'ausstehend';
  }
  if (isError) {
    return 'fehler';
  }
  if (data === undefined || istLeer(data)) {
    return 'leer';
  }
  return 'erfolg';
};
