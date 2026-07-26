import { describe, expect, it, mock } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';

import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import type { HalbjahrOperations } from './halbjahr-operations.ts';
import { HalbjahreManagementBoundary } from './halbjahre-management-boundary.tsx';

const operations: HalbjahrOperations = {
  create: mock(() => Promise.resolve()),
  delete: mock(() => Promise.resolve()),
  list: mock(
    () => new Promise<ReadonlyArray<HalbjahrWithNotenCount>>(() => undefined),
  ),
  update: mock(() => Promise.resolve()),
};

describe('HalbjahreManagementBoundary', () => {
  it('mounts deletion announcements before a success can update them', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <HalbjahreManagementBoundary operations={operations} />
      </QueryClientProvider>,
    );

    expect(markup).toContain('class="sr-only" role="status"');
    expect(markup).toContain('Halbjahre werden geladen');
  });
});
