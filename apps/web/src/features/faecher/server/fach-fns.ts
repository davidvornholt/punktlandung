import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { faecherKey } from '#/shared/query/query-keys.ts';
import { runServerEffect } from '#/shared/runtime.ts';
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
  .handler(({ data }) => runServerEffect(listFaecher(data.schoolYear)));

export const createFachFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(FachInput))
  .handler(({ data }) => runServerEffect(createFach(data)));

export const updateFachFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(FachUpdate))
  .handler(({ data }) => runServerEffect(updateFach(data)));

export const archiveFachFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(FachId))
  .handler(({ data }) =>
    runServerEffect(archiveFach(data.id, data.schoolYear)),
  );

export const faecherQueryOptions = (schoolYear: string) =>
  queryOptions({
    queryKey: faecherKey(schoolYear),
    queryFn: () => listFaecherFn({ data: { schoolYear } }),
  });
