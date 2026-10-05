import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { trendKey } from '#/shared/query/query-keys.ts';
import { runServerEffect } from '#/shared/runtime.ts';
import {
  NoteId,
  NoteInput,
  NotenQuery,
  NoteUpdate,
  PreparationTemplateInput,
  PreparationUpdate,
} from '../schemas/note-schema.ts';
import {
  createNote,
  deleteNote,
  listNoten,
  loadLeistung,
  updateNote,
  updatePreparation,
} from '../services/noten-service.ts';
import {
  loadPreparationTemplates,
  savePreparationTemplate,
} from '../services/preparation-template-service.ts';
import { loadTrend } from '../services/trend-service.ts';
import { loadUpcoming } from '../services/upcoming-service.ts';

export const listNotenFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(NotenQuery))
  .handler(({ data }) => runServerEffect(listNoten(data.termId)));

export const createNoteFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(NoteInput))
  .handler(({ data }) => runServerEffect(createNote(data)));

export const updateNoteFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(NoteUpdate))
  .handler(({ data }) => runServerEffect(updateNote(data)));

export const deleteNoteFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(NoteId))
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
  .inputValidator(Schema.standardSchemaV1(NoteId))
  .handler(({ data }) =>
    runServerEffect(loadLeistung(data.id, berlinCalendarDate())),
  );

export const updatePreparationFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(PreparationUpdate))
  .handler(({ data }) => runServerEffect(updatePreparation(data)));

export const preparationTemplatesFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .handler(() => runServerEffect(loadPreparationTemplates));

export const savePreparationTemplateFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(PreparationTemplateInput))
  .handler(({ data }) => runServerEffect(savePreparationTemplate(data)));
