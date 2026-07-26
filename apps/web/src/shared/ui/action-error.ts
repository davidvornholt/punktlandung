const field = (error: unknown, name: string): unknown =>
  typeof error === 'object' && error !== null && name in error
    ? (error as Record<string, unknown>)[name]
    : undefined;

export const actionErrorText = (
  error: unknown,
  infrastructureText: string,
): string => {
  const tag = field(error, '_tag');
  const message = field(error, 'message');
  if (
    typeof tag === 'string' &&
    !tag.endsWith('Error') &&
    typeof message === 'string' &&
    message.trim() !== ''
  ) {
    return message;
  }
  return infrastructureText;
};
