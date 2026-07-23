import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sitzungErforderlich } from '#/shared/auth/auth-middleware.ts';
import { berlinKalenderdatum } from '#/shared/datum/kalenderdatum.ts';
import { runtime } from '#/shared/runtime.ts';
import { LerntagEingabe } from '../schemas/lerntag-schema.ts';
import {
  ladeLernStatistik,
  listLerntage,
  logLerntag,
} from '../services/lernen-service.ts';

export const logLerntagFn = createServerFn({ method: 'POST' })
  .middleware([sitzungErforderlich])
  .inputValidator(Schema.standardSchemaV1(LerntagEingabe))
  .handler(({ data }) => runtime.runPromise(logLerntag(data)));

export const lernStatistikFn = createServerFn({ method: 'GET' })
  .middleware([sitzungErforderlich])
  .handler(() => runtime.runPromise(ladeLernStatistik(berlinKalenderdatum())));

export const listLerntageFn = createServerFn({ method: 'GET' })
  .middleware([sitzungErforderlich])
  .handler(() => runtime.runPromise(listLerntage()));

export const lernStatistikQueryOptions = queryOptions({
  queryKey: ['lern-statistik'],
  queryFn: () => lernStatistikFn(),
});
