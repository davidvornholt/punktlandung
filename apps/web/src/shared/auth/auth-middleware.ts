import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { runProtectedCall } from './protected-call.ts';
import { getAutorisierteSitzung } from './session.ts';

export const sitzungErforderlich = createMiddleware({
  type: 'function',
}).server(({ next }) =>
  runProtectedCall({
    authorize: () => getAutorisierteSitzung(getRequest().headers),
    next,
  }),
);
