import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { runServerEffect } from '#/shared/runtime.ts';
import {
  HalbjahrDeletionInput,
  HalbjahrInput,
  HalbjahrUpdate,
} from '../schemas/halbjahr-schema.ts';
import { deleteHalbjahr } from '../services/halbjahr-deletion-service.ts';
import {
  createHalbjahr,
  listHalbjahre,
  updateHalbjahr,
} from '../services/halbjahr-service.ts';

export const listHalbjahreFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .handler(() => runServerEffect(listHalbjahre));

export const createHalbjahrFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(HalbjahrInput))
  .handler(({ data }) => runServerEffect(createHalbjahr(data)));

export const updateHalbjahrFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(HalbjahrUpdate))
  .handler(({ data }) => runServerEffect(updateHalbjahr(data)));

export const deleteHalbjahrFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(HalbjahrDeletionInput))
  .handler(({ data }) => runServerEffect(deleteHalbjahr(data)));

export const halbjahreQueryOptions = queryOptions({
  queryKey: ['halbjahre'],
  queryFn: () => listHalbjahreFn(),
});
