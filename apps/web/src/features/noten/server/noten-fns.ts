import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sitzungErforderlich } from '#/shared/auth/auth-middleware.ts';
import { runtime } from '#/shared/runtime.ts';
import {
  NoteAktualisierung,
  NoteEingabe,
  NoteKennung,
  NotenAbfrage,
} from '../schemas/note-schema.ts';
import {
  createNote,
  deleteNote,
  listNoten,
  updateNote,
} from '../services/noten-service.ts';
import { ladeVerlauf } from '../services/verlauf-service.ts';

export const listNotenFn = createServerFn({ method: 'GET' })
  .middleware([sitzungErforderlich])
  .inputValidator(Schema.standardSchemaV1(NotenAbfrage))
  .handler(({ data }) => runtime.runPromise(listNoten(data.termId)));

export const createNoteFn = createServerFn({ method: 'POST' })
  .middleware([sitzungErforderlich])
  .inputValidator(Schema.standardSchemaV1(NoteEingabe))
  .handler(({ data }) => runtime.runPromise(createNote(data)));

export const updateNoteFn = createServerFn({ method: 'POST' })
  .middleware([sitzungErforderlich])
  .inputValidator(Schema.standardSchemaV1(NoteAktualisierung))
  .handler(({ data }) => runtime.runPromise(updateNote(data)));

export const deleteNoteFn = createServerFn({ method: 'POST' })
  .middleware([sitzungErforderlich])
  .inputValidator(Schema.standardSchemaV1(NoteKennung))
  .handler(({ data }) => runtime.runPromise(deleteNote(data.id)));

export const verlaufFn = createServerFn({ method: 'GET' })
  .middleware([sitzungErforderlich])
  .handler(() => runtime.runPromise(ladeVerlauf));

export const notenQueryOptions = (termId: string) =>
  queryOptions({
    queryKey: ['noten', termId],
    queryFn: () => listNotenFn({ data: { termId } }),
  });

export const verlaufQueryOptions = queryOptions({
  queryKey: ['verlauf'],
  queryFn: () => verlaufFn(),
});
