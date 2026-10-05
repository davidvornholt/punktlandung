import { describe, expect, it } from 'bun:test';

import { startInstance } from './start.ts';

describe('Start request middleware', () => {
  it.each([
    ['serverFn', 'same-origin', 200],
    ['serverFn', 'same-site', 403],
    ['serverFn', 'cross-site', 403],
    ['router', 'same-origin', 200],
    ['router', 'same-site', 200],
    ['router', 'cross-site', 200],
  ] as const)(
    'handles %s requests from %s with status %i',
    async (handlerType, fetchSite, expectedStatus) => {
      const options = await startInstance.getOptions();
      const middleware = options.requestMiddleware?.[0];
      const request = new Request('https://punktlandung.example/action', {
        method: 'POST',
        headers: { 'Sec-Fetch-Site': fetchSite },
      });
      const next = () => ({
        request,
        pathname: '/action',
        context: undefined,
        response: new Response('OK'),
      });
      const result = middleware?.options.server
        ? await middleware.options.server({
            request,
            pathname: '/action',
            context: undefined,
            handlerType,
            // This continuation does not extend the generic middleware context.
            next: next as Parameters<
              typeof middleware.options.server
            >[0]['next'],
          })
        : next();

      const response = result instanceof Response ? result : result.response;
      expect(response.status).toBe(expectedStatus);
    },
  );
});
