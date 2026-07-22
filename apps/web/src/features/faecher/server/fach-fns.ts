import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { runtime } from '#/shared/runtime.ts';
import {
  FachAktualisierung,
  FachEingabe,
  FachKennung,
  FaecherAbfrage,
} from '../schemas/fach-schema.ts';
import {
  archiveFach,
  createFach,
  listFaecher,
  updateFach,
} from '../services/fach-service.ts';

export const listFaecherFn = createServerFn({ method: 'GET' })
  .inputValidator(Schema.standardSchemaV1(FaecherAbfrage))
  .handler(({ data }) => runtime.runPromise(listFaecher(data.schoolYear)));

export const createFachFn = createServerFn({ method: 'POST' })
  .inputValidator(Schema.standardSchemaV1(FachEingabe))
  .handler(({ data }) => runtime.runPromise(createFach(data)));

export const updateFachFn = createServerFn({ method: 'POST' })
  .inputValidator(Schema.standardSchemaV1(FachAktualisierung))
  .handler(({ data }) => runtime.runPromise(updateFach(data)));

export const archiveFachFn = createServerFn({ method: 'POST' })
  .inputValidator(Schema.standardSchemaV1(FachKennung))
  .handler(({ data }) =>
    runtime.runPromise(archiveFach(data.id, data.schoolYear)),
  );

export const faecherQueryOptions = (schoolYear: string) =>
  queryOptions({
    queryKey: ['faecher', schoolYear],
    queryFn: () => listFaecherFn({ data: { schoolYear } }),
  });
