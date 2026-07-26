import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { trendKey } from '#/shared/query/query-keys.ts';
import { runtime } from '#/shared/runtime.ts';
import {
  NoteId,
  NoteInput,
  NotenQuery,
  NoteUpdate,
} from '../schemas/note-schema.ts';
import {
  createNote,
  deleteNote,
  listNoten,
  updateNote,
} from '../services/noten-service.ts';
import { loadTrend } from '../services/trend-service.ts';

export const listNotenFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(NotenQuery))
  .handler(({ data }) => runtime.runPromise(listNoten(data.termId)));

export const createNoteFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(NoteInput))
  .handler(({ data }) => runtime.runPromise(createNote(data)));

export const updateNoteFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(NoteUpdate))
  .handler(({ data }) => runtime.runPromise(updateNote(data)));

export const deleteNoteFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(NoteId))
  .handler(({ data }) => runtime.runPromise(deleteNote(data.id)));

export const verlaufFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .handler(() => runtime.runPromise(loadTrend));

export const trendQueryOptions = queryOptions({
  queryKey: trendKey,
  queryFn: () => verlaufFn(),
});
