const feld = (fehler: unknown, name: string): unknown =>
  typeof fehler === 'object' && fehler !== null && name in fehler
    ? (fehler as Record<string, unknown>)[name]
    : undefined;

export const aktionsfehlerText = (
  fehler: unknown,
  infrastrukturText: string,
): string => {
  const tag = feld(fehler, '_tag');
  const message = feld(fehler, 'message');
  if (
    typeof tag === 'string' &&
    !tag.endsWith('Error') &&
    typeof message === 'string' &&
    message.trim() !== ''
  ) {
    return message;
  }
  return infrastrukturText;
};
