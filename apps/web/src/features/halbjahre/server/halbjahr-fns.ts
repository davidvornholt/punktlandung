import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { runtime } from '#/shared/runtime.ts';
import { HalbjahrInput, HalbjahrUpdate } from '../schemas/halbjahr-schema.ts';
import {
  createHalbjahr,
  listHalbjahre,
  updateHalbjahr,
} from '../services/halbjahr-service.ts';

export const listHalbjahreFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .handler(() => runtime.runPromise(listHalbjahre));

export const createHalbjahrFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(HalbjahrInput))
  .handler(({ data }) => runtime.runPromise(createHalbjahr(data)));

export const updateHalbjahrFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(HalbjahrUpdate))
  .handler(({ data }) => runtime.runPromise(updateHalbjahr(data)));

export const halbjahreQueryOptions = queryOptions({
  queryKey: ['halbjahre'],
  queryFn: () => listHalbjahreFn(),
});
