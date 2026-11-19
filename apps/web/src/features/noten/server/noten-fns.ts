import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { trendKey } from '#/shared/query/query-keys.ts';
import { runServerEffect } from '#/shared/runtime.ts';
import {
  NoteId,
  NotenQuery,
  NoteSubmission,
  NoteUpdate,
} from '../schemas/note-schema.ts';
import {
  createSubmittedNote,
  deleteNote,
  listNoten,
  loadLeistung,
  updateNote,
} from '../services/noten-service.ts';
import { loadTrend } from '../services/trend-service.ts';
import { loadUpcoming } from '../services/upcoming-service.ts';

export const listNotenFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .validator(Schema.toStandardSchemaV1(NotenQuery))
  .handler(({ data }) => runServerEffect(listNoten(data.termId)));

export const createNoteFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .validator(Schema.toStandardSchemaV1(NoteSubmission))
  .handler(({ data }) => runServerEffect(createSubmittedNote(data)));

export const updateNoteFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .validator(Schema.toStandardSchemaV1(NoteUpdate))
  .handler(({ data }) => runServerEffect(updateNote(data)));

export const deleteNoteFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .validator(Schema.toStandardSchemaV1(NoteId))
  .handler(({ data }) => runServerEffect(deleteNote(data.id)));

export const verlaufFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .handler(() => runServerEffect(loadTrend));

export const trendQueryOptions = queryOptions({
  queryKey: trendKey,
  queryFn: () => verlaufFn(),
});

export const upcomingFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .handler(() => runServerEffect(loadUpcoming));

export const leistungFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .validator(Schema.toStandardSchemaV1(NoteId))
  .handler(({ data }) => runServerEffect(loadLeistung(data.id)));
