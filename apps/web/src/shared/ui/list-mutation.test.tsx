import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Fach } from '#/features/faecher/services/fach-service.ts';
import { FachList } from '#/features/faecher/ui/fach-list.tsx';
import type { NoteWithFach } from '#/features/noten/services/noten-service.ts';
import { NotenCards } from '#/features/noten/ui/noten-cards.tsx';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { ListMutation } from './list-mutation.ts';

const delayedRejection = () => {
  let reject: (error: unknown) => void = () => undefined;
  const result = new Promise<void>((_resolve, rejection) => {
    reject = rejection;
  });
  return { reject, result };
};

const fach = (id: string): Fach => ({
  gewichtung: standardgewichtung,
  id,
  name: `Ziel ${id}`,
  shortName: id,
  sortOrder: id === 'A' ? 0 : 1,
});

const note = (id: string): NoteWithFach => ({
  datum: id === 'A' ? '2026-01-01' : '2026-01-02',
  fachId: 'mathematik',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  gewicht: 1,
  gewichtung: standardgewichtung,
  id,
  kind: 'klausur',
  notiz: `Ziel ${id}`,
  wert: 2,
});

const pending: ListMutation<string> = {
  error: null,
  isError: false,
  isPending: true,
  variables: 'A',
};

const errorPosition = (markup: string) => ({
  alert: markup.indexOf('role="alert"'),
  alertCount: markup.match(/role="alert"/gu)?.length ?? 0,
  targetA: markup.indexOf('Ziel A'),
  targetB: markup.indexOf('Ziel B'),
});

describe('geteilte Listenmutation in den verwendeten Komponenten', () => {
  it('FachList sperrt B während A und kündigt As verzögerten Fehler an', async () => {
    const delay = delayedRejection();
    const runFromA = delay.result.catch((cause: unknown) => cause);
    const faecher = [fach('A'), fach('B')];
    const pendingMarkup = renderToStaticMarkup(
      <FachList
        archiveMutation={pending}
        faecher={faecher}
        onArchive={() => undefined}
        onEdit={() => undefined}
      />,
    );

    expect(pendingMarkup.match(/disabled=""/gu)).toHaveLength(2);
    expect(pendingMarkup.match(/Wird archiviert …/gu)).toHaveLength(1);

    delay.reject(new Error('A ist fehlgeschlagen'));
    const error = await runFromA;
    const errorMarkup = renderToStaticMarkup(
      <FachList
        archiveMutation={{
          error,
          isError: true,
          isPending: false,
          variables: 'A',
        }}
        faecher={faecher}
        onArchive={() => undefined}
        onEdit={() => undefined}
      />,
    );
    const position = errorPosition(errorMarkup);
    expect(position.targetA).toBeGreaterThanOrEqual(0);
    expect(position.alert).toBeGreaterThan(position.targetA);
    expect(position.targetB).toBeGreaterThan(position.alert);
    expect(position.alertCount).toBe(1);
  });

  it('NotenCards sperrt B während A und kündigt As verzögerten Fehler an', async () => {
    const delay = delayedRejection();
    const runFromA = delay.result.catch((cause: unknown) => cause);
    const noten = [note('A'), note('B')];
    const pendingMarkup = renderToStaticMarkup(
      <NotenCards
        deleteMutation={pending}
        noten={noten}
        onDelete={() => undefined}
        system="sechser"
      />,
    );

    expect(pendingMarkup.match(/disabled=""/gu)).toHaveLength(2);
    expect(pendingMarkup.match(/Wird gelöscht …/gu)).toHaveLength(1);

    delay.reject(new Error('A ist fehlgeschlagen'));
    const error = await runFromA;
    const errorMarkup = renderToStaticMarkup(
      <NotenCards
        deleteMutation={{
          error,
          isError: true,
          isPending: false,
          variables: 'A',
        }}
        noten={noten}
        onDelete={() => undefined}
        system="sechser"
      />,
    );
    const position = errorPosition(errorMarkup);
    expect(position.targetA).toBeGreaterThanOrEqual(0);
    expect(position.alert).toBeGreaterThan(position.targetA);
    expect(position.targetB).toBeGreaterThan(position.alert);
    expect(position.alertCount).toBe(1);
  });
});
