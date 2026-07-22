import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { runtime } from '#/shared/runtime.ts';
import {
  FachAktualisierung,
  FachEingabe,
  FachKennung,
} from '../schemas/fach-schema.ts';
import {
  archiveFach,
  createFach,
  listFaecher,
  updateFach,
} from '../services/fach-service.ts';

export const listFaecherFn = createServerFn({ method: 'GET' }).handler(() =>
  runtime.runPromise(listFaecher),
);

export const createFachFn = createServerFn({ method: 'POST' })
  .inputValidator(Schema.standardSchemaV1(FachEingabe))
  .handler(({ data }) => runtime.runPromise(createFach(data)));

export const updateFachFn = createServerFn({ method: 'POST' })
  .inputValidator(Schema.standardSchemaV1(FachAktualisierung))
  .handler(({ data }) => runtime.runPromise(updateFach(data)));

export const archiveFachFn = createServerFn({ method: 'POST' })
  .inputValidator(Schema.standardSchemaV1(FachKennung))
  .handler(({ data }) => runtime.runPromise(archiveFach(data.id)));

export const faecherQueryOptions = queryOptions({
  queryKey: ['faecher'],
  queryFn: () => listFaecherFn(),
});
