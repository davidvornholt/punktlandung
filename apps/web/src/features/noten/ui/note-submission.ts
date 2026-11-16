import type { NotenFields } from '../schemas/note-schema.ts';

/**
 * Die ID bleibt gleich, solange dieselben Eingaben abgeschickt werden; das
 * deckt den Versuch nach einem technischen Fehler ab. Geänderte Eingaben sind eine neue
 * Abgabe, damit eine Korrektur nie als Wiederholung der alten verschluckt wird.
 */
export const createSubmissionIds = (
  createId: () => string = () => crypto.randomUUID(),
) => {
  let current: { readonly key: string; readonly id: string } | null = null;

  return {
    idFor: (halbjahrId: string, values: NotenFields): string => {
      const key = JSON.stringify([halbjahrId, values]);
      if (current?.key !== key) {
        current = { key, id: createId() };
      }
      return current.id;
    },
    /** Dieselbe Note, später noch einmal eingegeben, ist eine neue Note. */
    settle: (): void => {
      current = null;
    },
  };
};
