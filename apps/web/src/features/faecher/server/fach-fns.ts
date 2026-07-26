import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { runtime } from '#/shared/runtime.ts';
import {
  FachId,
  FachInput,
  FachUpdate,
  FaecherQuery,
} from '../schemas/fach-schema.ts';
import {
  archiveFach,
  createFach,
  listFaecher,
  updateFach,
} from '../services/fach-service.ts';

export const listFaecherFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(FaecherQuery))
  .handler(({ data }) => runtime.runPromise(listFaecher(data.schoolYear)));

export const createFachFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(FachInput))
  .handler(({ data }) => runtime.runPromise(createFach(data)));

export const updateFachFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(FachUpdate))
  .handler(({ data }) => runtime.runPromise(updateFach(data)));

export const archiveFachFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(FachId))
  .handler(({ data }) =>
    runtime.runPromise(archiveFach(data.id, data.schoolYear)),
  );

export const faecherQueryOptions = (schoolYear: string) =>
  queryOptions({
    queryKey: ['faecher', schoolYear],
    queryFn: () => listFaecherFn({ data: { schoolYear } }),
  });
