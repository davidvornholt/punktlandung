import { describe, expect, it, mock } from 'bun:test';

import type { QueryInvalidator } from '#/shared/query/query-invalidation.ts';
import type { NoteUpdate } from '../schemas/note-schema.ts';
import { notenMutationOptions } from './noten-mutations.ts';
import type { NotenOperations } from './noten-operations.ts';

const values = {
  datum: '2026-03-02',
  gewicht: 1,
  id: 'note-a',
  kind: 'klausur',
  notiz: null,
  subjectId: 'latein',
  wert: 2,
} as unknown as NoteUpdate;

/**
 * Ein Abfragespeicher, dessen Entwertungen erst auf Zuruf durchgehen. Nur so
 * ist prüfbar, ob der Nachlauf einer Mutation sie abwartet oder nur anstößt.
 */
const heldInvalidator = () => {
  const released: Array<() => void> = [];
  const queryKeys: Array<ReadonlyArray<string>> = [];
  return {
    queryClient: {
      invalidateQueries: (selection: {
        readonly queryKey: ReadonlyArray<string>;
      }) => {
        queryKeys.push(selection.queryKey);
        return new Promise<void>((resolve) => {
          released.push(resolve);
        });
      },
    } satisfies QueryInvalidator,
    queryKeys,
    release: () => {
      for (const resolve of released) {
        resolve();
      }
    },
  };
};

/** Wartet, bis jede anhängige Mikroaufgabe gelaufen ist. */
const flush = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const setup = () => {
  const held = heldInvalidator();
  const operations: NotenOperations = {
    create: mock(() => Promise.resolve()),
    delete: mock(() => Promise.resolve()),
    list: mock(() => Promise.resolve([])),
    update: mock(() => Promise.resolve()),
  };
  const onDeleted = mock((_id: string) => undefined);
  const onUpdated = mock((_id: string) => undefined);
  const onUpdateFailed = mock((_id: string, _error: unknown) => undefined);
  const options = notenMutationOptions({
    halbjahrId: 'hj-1',
    onDeleted,
    onUpdated,
    onUpdateFailed,
    operations,
    queryClient: held.queryClient,
  });
  return { held, onDeleted, onUpdated, onUpdateFailed, operations, options };
};

const expectedKeys = [['noten', 'hj-1'], ['trend'], ['zeugnis']];

describe('notenMutationOptions', () => {
  it('schickt Änderung und Löschung an die Serveraufrufe', async () => {
    const { operations, options } = setup();

    await options.update.mutationFn(values);
    await options.delete.mutationFn('note-a');

    expect(operations.update).toHaveBeenCalledWith(values);
    expect(operations.delete).toHaveBeenCalledWith('note-a');
  });

  /**
   * Ändern und Löschen verschieben denselben Notenstand: Notenliste, Verlauf
   * und jede Zeugnisvorschau. Bliebe eine davon stehen, zeigte sie einen
   * Fachschnitt von vor der Änderung.
   */
  it('entwertet nach beiden Mutationen Noten, Verlauf und Zeugnis', async () => {
    const changed = setup();
    const removed = setup();

    const runs = [
      changed.options.update.onSuccess(undefined, values),
      removed.options.delete.onSuccess(undefined, 'note-a'),
    ];
    changed.held.release();
    removed.held.release();
    await Promise.all(runs);

    expect([...changed.held.queryKeys].sort()).toEqual(expectedKeys);
    expect([...removed.held.queryKeys].sort()).toEqual(expectedKeys);
  });

  /**
   * Erst entwerten, dann melden. Schlösse die Bearbeitung vorher, gäbe die
   * Fokusrückgabe den Fokus an den Zeilenknopf, den der folgende Neuabruf
   * entfernt, sobald die Note in ein anderes Fach gewandert ist — der Fokus
   * fiele auf <body>.
   */
  it('meldet den Ausgang erst, wenn die Entwertung durch ist', async () => {
    const { held, onDeleted, onUpdated, options } = setup();

    const saved = options.update.onSuccess(undefined, values);
    const deleted = options.delete.onSuccess(undefined, 'note-a');
    await flush();
    expect(onUpdated).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();

    held.release();
    await Promise.all([saved, deleted]);

    expect(onUpdated).toHaveBeenCalledWith('note-a');
    expect(onDeleted).toHaveBeenCalledWith('note-a');
  });

  /**
   * Die Liste teilt sich eine Änderungsmutation über alle Zeilen. Ohne die
   * Kennung der gescheiterten Note wüsste die Liste nicht, welche Zeile ihre
   * Änderung nicht bekommen hat.
   */
  it('meldet einen Fehlschlag der Note, die ihn ausgelöst hat', () => {
    const { onUpdateFailed, options } = setup();
    const error = new Error('Verbindung weg');

    options.update.onError(error, values);

    expect(onUpdateFailed).toHaveBeenCalledWith('note-a', error);
  });
});
