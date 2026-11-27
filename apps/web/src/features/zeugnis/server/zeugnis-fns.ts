import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { runServerEffect } from '#/shared/runtime.ts';
import { ZeugnisQuery } from '../schemas/zeugnis-schema.ts';
import { loadZeugnis } from '../services/zeugnis-service.ts';

export const zeugnisFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .validator(Schema.toStandardSchemaV1(ZeugnisQuery))
  .handler(({ data }) => runServerEffect(loadZeugnis(data.termId)));
