import { afterAll, describe, expect, it, mock } from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';

mock.module('../server/halbjahr-fns.ts', () => ({
  createHalbjahrFn: mock(() => Promise.resolve()),
  deleteHalbjahrFn: mock(() => Promise.resolve()),
  halbjahreQueryOptions: {
    queryFn: () => new Promise(() => undefined),
    queryKey: ['halbjahre'],
  },
  updateHalbjahrFn: mock(() => Promise.resolve()),
}));

const { HalbjahreVerwaltung } = await import('./halbjahre-verwaltung.tsx');

afterAll(() => {
  mock.restore();
});

describe('HalbjahreVerwaltung', () => {
  it('mounts deletion announcements before a success can update them', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <HalbjahreVerwaltung />
      </QueryClientProvider>,
    );

    expect(markup).toContain('class="sr-only" role="status"');
    expect(markup).toContain('Halbjahre werden geladen');
  });
});
