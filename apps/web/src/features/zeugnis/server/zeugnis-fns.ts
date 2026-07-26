import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { runtime } from '#/shared/runtime.ts';
import { ZeugnisQuery } from '../schemas/zeugnis-schema.ts';
import { loadZeugnis } from '../services/zeugnis-service.ts';

export const zeugnisFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(ZeugnisQuery))
  .handler(({ data }) => runtime.runPromise(loadZeugnis(data.termId)));

export const zeugnisQueryOptions = (termId: string) =>
  queryOptions({
    queryKey: ['zeugnis', termId],
    queryFn: () => zeugnisFn({ data: { termId } }),
  });
