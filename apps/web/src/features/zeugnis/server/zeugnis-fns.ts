import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { runtime } from '#/shared/runtime.ts';
import { ladeZeugnis } from '../services/zeugnis-service.ts';

const ZeugnisAbfrage = Schema.Struct({
  termId: Schema.String,
});

export const zeugnisFn = createServerFn({ method: 'GET' })
  .inputValidator(Schema.standardSchemaV1(ZeugnisAbfrage))
  .handler(({ data }) => runtime.runPromise(ladeZeugnis(data.termId)));

export const zeugnisQueryOptions = (termId: string) =>
  queryOptions({
    queryKey: ['zeugnis', termId],
    queryFn: () => zeugnisFn({ data: { termId } }),
  });
