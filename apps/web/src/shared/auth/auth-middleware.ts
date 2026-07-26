import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { runProtectedCall } from './protected-call.ts';
import { getAuthorizedSession } from './session.ts';

export const sessionRequired = createMiddleware({
  type: 'function',
}).server(({ next }) =>
  runProtectedCall({
    authorize: () => getAuthorizedSession(getRequest().headers),
    next,
  }),
);
