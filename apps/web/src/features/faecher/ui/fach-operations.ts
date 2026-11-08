import type { FachId, FachInput, FachUpdate } from '../schemas/fach-schema.ts';
import {
  archiveFachFn,
  createFachFn,
  listFaecherFn,
  updateFachFn,
} from '../server/fach-fns.ts';
import type { Fach } from '../services/fach-service.ts';

/**
 * Die Serveraufrufe der Fachverwaltung hinter einer Naht. Die Mutationslogik
 * hängt dadurch nicht an den Serverfunktionen und bleibt ohne deren
 * Laufzeitumgebung prüfbar.
 */
export type FachOperations = {
  readonly archive: (values: FachId) => Promise<unknown>;
  readonly create: (values: FachInput) => Promise<unknown>;
  readonly list: (schoolYear: string) => Promise<ReadonlyArray<Fach>>;
  readonly update: (values: FachUpdate) => Promise<unknown>;
};

export const liveFachOperations: FachOperations = {
  archive: (values) => archiveFachFn({ data: values }),
  create: (values) => createFachFn({ data: values }),
  list: (schoolYear) => listFaecherFn({ data: { schoolYear } }),
  update: (values) => updateFachFn({ data: values }),
};
