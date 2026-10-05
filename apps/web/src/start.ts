import { createStart } from '@tanstack/react-start';

import { domainErrorAdapter } from './domain-errors.ts';

export const startInstance = createStart(() => ({
  serializationAdapters: [domainErrorAdapter],
}));
