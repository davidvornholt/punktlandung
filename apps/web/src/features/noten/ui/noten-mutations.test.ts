import { describe, expect, it, mock } from 'bun:test';

import type { QueryInvalidator } from '#/shared/query/query-invalidation.ts';
import type { NoteInput, NoteUpdate } from '../schemas/note-schema.ts';
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

const fresh = { ...values, id: 'note-neu', termId: 'hj-1' } as NoteInput;

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
  const onCreated = mock((_values: NoteInput) => undefined);
  const onDeleted = mock((_id: string) => undefined);
  const onUpdated = mock((_values: NoteUpdate) => undefined);
  const onUpdateFailed = mock((_id: string, _error: unknown) => undefined);
  const options = notenMutationOptions({
    halbjahrId: 'hj-1',
    onCreated,
    onDeleted,
    onUpdated,
    onUpdateFailed,
    operations,
    queryClient: held.queryClient,
  });
  return {
    held,
    onCreated,
    onDeleted,
    onUpdated,
    onUpdateFailed,
    operations,
    options,
  };
};

/** Alphabetisch, weil die Prüfung die Schlüssel sortiert vergleicht. */
const expectedKeys = [
  ['leistung'],
  ['noten', 'hj-1'],
  ['trend'],
  ['upcoming'],
  ['zeugnis'],
];

describe('notenMutationOptions', () => {
  it('reicht jede Eingabe an ihren Serveraufruf weiter', async () => {
    const { operations, options } = setup();

    await options.create.mutationFn(fresh);
    await options.update.mutationFn(values);
    await options.delete.mutationFn('note-a');

    expect(operations.create).toHaveBeenCalledWith(fresh);
    expect(operations.update).toHaveBeenCalledWith(values);
    expect(operations.delete).toHaveBeenCalledWith('note-a');
  });

  /**
   * Eintragen, Ändern und Löschen verschieben denselben Notenstand:
   * Notenliste, Verlauf und jede Zeugnisvorschau. Bliebe eine davon stehen,
   * zeigte sie einen Fachschnitt von vor der Änderung.
   */
  it('entwertet nach jeder Mutation Noten, Verlauf und Zeugnis', async () => {
    const created = setup();
    const changed = setup();
    const removed = setup();

    const runs = [
      created.options.create.onSuccess(undefined, fresh),
      changed.options.update.onSuccess(undefined, values),
      removed.options.delete.onSuccess(undefined, 'note-a'),
    ];
    created.held.release();
    changed.held.release();
    removed.held.release();
    await Promise.all(runs);

    expect([...created.held.queryKeys].sort()).toEqual(expectedKeys);
    expect([...changed.held.queryKeys].sort()).toEqual(expectedKeys);
    expect([...removed.held.queryKeys].sort()).toEqual(expectedKeys);
  });

  /**
   * Erst entwerten, dann melden. Schlösse der Eintrag vorher, läge die Note
   * noch nicht auf der Skala, auf der sie landen soll, und die Fokusrückgabe
   * gäbe den Fokus an den Zeilenknopf, den der folgende Neuabruf entfernt,
   * sobald die Note in ein anderes Fach gewandert ist: der Fokus fiele auf
   * <body>.
   */
  it('meldet den Ausgang erst, wenn die Entwertung durch ist', async () => {
    const { held, onCreated, onDeleted, onUpdated, options } = setup();

    const entered = options.create.onSuccess(undefined, fresh);
    const saved = options.update.onSuccess(undefined, values);
    const deleted = options.delete.onSuccess(undefined, 'note-a');
    await flush();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();

    held.release();
    await Promise.all([entered, saved, deleted]);

    // Die Liste sagt an, was gespeichert wurde, und braucht dafür die Werte, nicht nur die Kennung.
    expect(onCreated).toHaveBeenCalledWith(fresh);
    expect(onUpdated).toHaveBeenCalledWith(values);
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
