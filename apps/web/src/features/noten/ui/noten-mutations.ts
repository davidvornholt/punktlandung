import type { QueryInvalidator } from '#/shared/query/query-invalidation.ts';
import type { NoteUpdate } from '../schemas/note-schema.ts';
import { invalidateNotenQueries } from './noten-invalidation.ts';
import type { NotenOperations } from './noten-operations.ts';

/**
 * Ändern und Löschen einer Note als reine Optionen, damit prüfbar bleibt, was
 * ein Schreibvorgang nach sich zieht.
 *
 * Beide melden ihren Ausgang erst, wenn die veralteten Ansichten entwertet
 * sind: schlösse die Bearbeitung vorher, gäbe die Fokusrückgabe den Fokus an
 * den Zeilenknopf, den der folgende Neuabruf entfernt, sobald die Note in ein
 * anderes Fach gewandert ist.
 *
 * Ein Fehlschlag wird der Note gemeldet, die ihn ausgelöst hat. Die geteilte
 * Mutation kennt nur ihren letzten Ausgang; ohne die Kennung verwarf das
 * Speichern einer zweiten Note den Fehler der ersten, und diese bliebe
 * stillschweigend ungeändert.
 */
export const notenMutationOptions = ({
  halbjahrId,
  onDeleted,
  onUpdated,
  onUpdateFailed,
  operations,
  queryClient,
}: {
  readonly halbjahrId: string;
  readonly onDeleted: (id: string) => void;
  readonly onUpdated: (id: string) => void;
  readonly onUpdateFailed: (id: string, error: unknown) => void;
  readonly operations: NotenOperations;
  readonly queryClient: QueryInvalidator;
}) => {
  const refresh = () => invalidateNotenQueries(queryClient, halbjahrId);
  return {
    delete: {
      mutationFn: (id: string) => operations.delete(id),
      onSuccess: (_result: unknown, id: string) =>
        refresh().then(() => onDeleted(id)),
    },
    update: {
      mutationFn: (values: NoteUpdate) => operations.update(values),
      onError: (error: unknown, values: NoteUpdate) =>
        onUpdateFailed(values.id, error),
      onSuccess: (_result: unknown, values: NoteUpdate) =>
        refresh().then(() => onUpdated(values.id)),
    },
  };
};
