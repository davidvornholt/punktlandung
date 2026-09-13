import type {
  PreparationTemplateInput,
  PreparationUpdate,
} from '../schemas/note-schema.ts';
import {
  leistungFn,
  preparationTemplatesFn,
  savePreparationTemplateFn,
  updatePreparationFn,
} from '../server/noten-fns.ts';
import type { LeistungDetail } from '../services/noten-service.ts';
import type { PreparationTemplates } from '../services/preparation-template-service.ts';

/**
 * Die Serveraufrufe der Detailseite und der Vorlagen hinter einer Naht, wie
 * `NotenOperations`: so lassen sich Seite und Vorbereitung ohne die Laufzeit
 * der Serverfunktionen rendern und prüfen.
 */
export type LeistungOperations = {
  readonly load: (id: string) => Promise<LeistungDetail>;
  readonly loadTemplates: () => Promise<PreparationTemplates>;
  readonly saveTemplate: (input: PreparationTemplateInput) => Promise<unknown>;
  readonly updatePreparation: (input: PreparationUpdate) => Promise<unknown>;
};

export const liveLeistungOperations: LeistungOperations = {
  load: (id) => leistungFn({ data: { id } }),
  loadTemplates: () => preparationTemplatesFn(),
  saveTemplate: (input) => savePreparationTemplateFn({ data: input }),
  updatePreparation: (input) => updatePreparationFn({ data: input }),
};
