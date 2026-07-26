import { actionErrorText } from '#/shared/ui/action-error.ts';
import type { NoteWithFach } from '../services/noten-service.ts';

/**
 * Gescheiterte Änderungen, je Note festgehalten. Die Notenliste teilt sich
 * eine Mutation über alle Zeilen, und die kennt nur ihren letzten Ausgang.
 */
export type UpdateErrors = ReadonlyMap<string, unknown>;

export const noUpdateErrors: UpdateErrors = new Map();

export const withoutNote = (errors: UpdateErrors, id: string): UpdateErrors => {
  const rest = new Map(errors);
  rest.delete(id);
  return rest;
};

export const withNote = (
  errors: UpdateErrors,
  id: string,
  error: unknown,
): UpdateErrors => new Map(errors).set(id, error);

export const updateErrorText = (error: unknown) =>
  error === undefined
    ? null
    : actionErrorText(
        error,
        'Die Note konnte nicht geändert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
      );

/**
 * Schließt die Bearbeitung nur, wenn der abgeschlossene Vorgang ihr galt: der
 * Benutzer kann inzwischen eine andere Note geöffnet haben.
 */
export const closeIfSaved =
  (id: string) =>
  (open: NoteWithFach | null): NoteWithFach | null =>
    open?.id === id ? null : open;

/** Läuft gerade das Speichern der offenen Bearbeitung? */
export const isEditPending = (
  update: {
    readonly isPending: boolean;
    readonly variables?: { readonly id: string } | undefined;
  },
  editTarget: NoteWithFach | null,
) =>
  update.isPending &&
  editTarget !== null &&
  update.variables?.id === editTarget.id;
