import type { FachId, FachInput, FachUpdate } from '../schemas/fach-schema.ts';
import {
  archiveFachFn,
  createFachFn,
  updateFachFn,
} from '../server/fach-fns.ts';

/**
 * Die Serveraufrufe der Fachverwaltung hinter einer Naht. Die Mutationslogik
 * hängt dadurch nicht an den Serverfunktionen und bleibt ohne deren
 * Laufzeitumgebung prüfbar.
 */
export type FachOperations = {
  readonly archive: (values: FachId) => Promise<unknown>;
  readonly create: (values: FachInput) => Promise<unknown>;
  readonly update: (values: FachUpdate) => Promise<unknown>;
};

export const liveFachOperations: FachOperations = {
  archive: (values) => archiveFachFn({ data: values }),
  create: (values) => createFachFn({ data: values }),
  update: (values) => updateFachFn({ data: values }),
};
