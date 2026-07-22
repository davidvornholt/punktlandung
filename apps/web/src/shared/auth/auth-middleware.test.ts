import { describe, expect, it } from 'bun:test';

import { runProtectedCall } from './protected-call.ts';

describe('server-function authentication', () => {
  it('rejects before calling the protected operation', async () => {
    let called = false;
    const result = runProtectedCall({
      authorize: () => Promise.resolve(null),
      next: () => {
        called = true;
        return Promise.resolve('sensitive data');
      },
    });
    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(called).toBeFalse();
  });

  it('allows the protected operation for an authorized session', async () => {
    const result = await runProtectedCall({
      authorize: () => Promise.resolve({ name: 'David' }),
      next: () => Promise.resolve('sensitive data'),
    });
    expect(result).toBe('sensitive data');
  });
});
