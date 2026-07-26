import type { NoteInput, NoteUpdate } from '../schemas/note-schema.ts';
import {
  createNoteFn,
  deleteNoteFn,
  listNotenFn,
  updateNoteFn,
} from '../server/noten-fns.ts';
import type { NoteWithFach } from '../services/noten-service.ts';

/**
 * Die Serveraufrufe der Notenliste hinter einer Naht. Liste und Mutationen
 * hängen dadurch nicht an den Serverfunktionen, die beim Laden die Umgebung
 * lesen — die Bausteine bleiben ohne deren Laufzeitumgebung prüfbar.
 */
export type NotenOperations = {
  readonly create: (values: NoteInput) => Promise<unknown>;
  readonly delete: (id: string) => Promise<unknown>;
  readonly list: (halbjahrId: string) => Promise<ReadonlyArray<NoteWithFach>>;
  readonly update: (values: NoteUpdate) => Promise<unknown>;
};

export const liveNotenOperations: NotenOperations = {
  create: (values) => createNoteFn({ data: values }),
  delete: (id) => deleteNoteFn({ data: { id } }),
  list: (halbjahrId) => listNotenFn({ data: { termId: halbjahrId } }),
  update: (values) => updateNoteFn({ data: values }),
};
