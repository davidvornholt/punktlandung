import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { runtime } from '#/shared/runtime.ts';
import {
  HalbjahrAktualisierung,
  HalbjahrEingabe,
} from '../schemas/halbjahr-schema.ts';
import {
  createHalbjahr,
  listHalbjahre,
  updateHalbjahr,
} from '../services/halbjahr-service.ts';

export const listHalbjahreFn = createServerFn({ method: 'GET' }).handler(() =>
  runtime.runPromise(listHalbjahre),
);

export const createHalbjahrFn = createServerFn({ method: 'POST' })
  .inputValidator(Schema.standardSchemaV1(HalbjahrEingabe))
  .handler(({ data }) => runtime.runPromise(createHalbjahr(data)));

export const updateHalbjahrFn = createServerFn({ method: 'POST' })
  .inputValidator(Schema.standardSchemaV1(HalbjahrAktualisierung))
  .handler(({ data }) => runtime.runPromise(updateHalbjahr(data)));

export const halbjahreQueryOptions = queryOptions({
  queryKey: ['halbjahre'],
  queryFn: () => listHalbjahreFn(),
});
