import { describe, expect, it, mock } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';

import { fachMutationOptions } from './fach-mutations.ts';
import type { FachOperations } from './fach-operations.ts';

const operations: FachOperations = {
  archive: mock(() => Promise.resolve()),
  create: mock(() => Promise.resolve()),
  update: mock(() => Promise.resolve()),
};

const seeded = () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['faecher', '2026/27'], []);
  queryClient.setQueryData(['noten', 'hj-1'], []);
  queryClient.setQueryData(['zeugnis', 'hj-1'], {});
  queryClient.setQueryData(['trend'], []);
  return queryClient;
};

const invalidatedKeys = (queryClient: QueryClient) =>
  queryClient
    .getQueryCache()
    .findAll()
    .filter((query) => query.state.isInvalidated)
    .map((query) => query.queryKey);

const options = (queryClient: QueryClient, onEditorClose: () => void) =>
  fachMutationOptions({
    onEditorClose,
    operations,
    queryClient,
    schoolYear: '2026/27',
  });

describe('fachMutationOptions', () => {
  /**
   * Anlegen, Ändern und Archivieren verschieben denselben Fachstand: keine
   * dieser Mutationen darf nur die Fächerliste erneuern und Fachschnitt,
   * Zeugnisvorschau und Verlauf mit dem alten Stand stehen lassen.
   */
  it('erneuert nach jeder der drei Mutationen alle betroffenen Ansichten', async () => {
    const expected = [
      ['faecher', '2026/27'],
      ['noten', 'hj-1'],
      ['trend'],
      ['zeugnis', 'hj-1'],
    ];

    const clients = [seeded(), seeded(), seeded()] as const;
    const [afterCreate, afterUpdate, afterArchive] = clients;
    await options(afterCreate, () => undefined).create.onSuccess();
    await options(afterUpdate, () => undefined).update.onSuccess();
    await options(afterArchive, () => undefined).archive.onSuccess();

    for (const queryClient of clients) {
      expect([...invalidatedKeys(queryClient)].sort()).toEqual(expected);
    }
  });

  /** Alle drei Mutationen gehören zum gewählten Schuljahr, nicht zu allen. */
  it('schickt jede Mutation mit dem gewählten Schuljahr an den Server', async () => {
    const all = options(seeded(), () => undefined);
    const fields = { name: 'Latein', shortName: 'L' } as unknown as Parameters<
      typeof all.create.mutationFn
    >[0];

    await all.create.mutationFn(fields);
    await all.update.mutationFn({ ...fields, id: 'latein' });
    await all.archive.mutationFn('latein');

    expect(operations.create).toHaveBeenCalledWith({
      ...fields,
      schoolYear: '2026/27',
    });
    expect(operations.update).toHaveBeenCalledWith({
      ...fields,
      id: 'latein',
      schoolYear: '2026/27',
    });
    expect(operations.archive).toHaveBeenCalledWith({
      id: 'latein',
      schoolYear: '2026/27',
    });
  });

  it('schließt das Formular nur beim Anlegen und Ändern', async () => {
    const onEditorClose = mock(() => undefined);
    const all = options(seeded(), onEditorClose);

    await all.create.onSuccess();
    await all.update.onSuccess();
    expect(onEditorClose).toHaveBeenCalledTimes(2);

    await all.archive.onSuccess();
    expect(onEditorClose).toHaveBeenCalledTimes(2);
  });
});
