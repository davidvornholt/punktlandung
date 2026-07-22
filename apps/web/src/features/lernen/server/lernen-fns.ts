import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sitzungErforderlich } from '#/shared/auth/auth-middleware.ts';
import { runtime } from '#/shared/runtime.ts';
import { LerntagEingabe } from '../schemas/lerntag-schema.ts';
import {
  ladeLernStatistik,
  listLerntage,
  logLerntag,
} from '../services/lernen-service.ts';

const heutigesDatum = () =>
  new Date().toISOString().slice(0, '0000-00-00'.length);

export const logLerntagFn = createServerFn({ method: 'POST' })
  .middleware([sitzungErforderlich])
  .inputValidator(Schema.standardSchemaV1(LerntagEingabe))
  .handler(({ data }) => runtime.runPromise(logLerntag(data)));

export const lernStatistikFn = createServerFn({ method: 'GET' })
  .middleware([sitzungErforderlich])
  .handler(() => runtime.runPromise(ladeLernStatistik(heutigesDatum())));

export const listLerntageFn = createServerFn({ method: 'GET' })
  .middleware([sitzungErforderlich])
  .handler(() => runtime.runPromise(listLerntage()));

export const lernStatistikQueryOptions = queryOptions({
  queryKey: ['lern-statistik'],
  queryFn: () => lernStatistikFn(),
});
