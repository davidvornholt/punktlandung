type ProtectedCall<T> = {
  readonly authorize: () => Promise<unknown | null>;
  readonly next: () => Promise<T>;
};

export const runProtectedCall = async <T>({
  authorize,
  next,
}: ProtectedCall<T>): Promise<T> => {
  const session = await authorize();
  if (!session) {
    throw new Response('Nicht autorisiert.', { status: 401 });
  }
  return next();
};
