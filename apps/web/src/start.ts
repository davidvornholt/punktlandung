import { createCsrfMiddleware, createStart } from '@tanstack/react-start';

import { domainErrorAdapter } from './domain-errors.ts';

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' }),
  ],
  serializationAdapters: [domainErrorAdapter],
}));
