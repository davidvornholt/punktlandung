import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { runtime } from '#/shared/runtime.ts';
import { loadZeugnis } from '../services/zeugnis-service.ts';

const ZeugnisQuery = Schema.Struct({
  halbjahrId: Schema.String,
});

export const zeugnisFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(ZeugnisQuery))
  .handler(({ data }) => runtime.runPromise(loadZeugnis(data.halbjahrId)));

export const zeugnisQueryOptions = (halbjahrId: string) =>
  queryOptions({
    queryKey: ['zeugnis', halbjahrId],
    queryFn: () => zeugnisFn({ data: { halbjahrId } }),
  });
