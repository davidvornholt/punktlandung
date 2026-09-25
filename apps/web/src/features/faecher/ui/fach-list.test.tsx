import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import type { Fach } from '../services/fach-service.ts';
import { FachList } from './fach-list.tsx';

const delayedRejection = () => {
  let reject: (error: unknown) => void = () => undefined;
  const result = new Promise<void>((_resolve, rejection) => {
    reject = rejection;
  });
  return { reject, result };
};

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

const fach = (id: string): Fach => ({
  gewichtung: standardgewichtung,
  id,
  name: `Ziel ${id}`,
  shortName: id,
  sortOrder: id === 'A' ? 0 : 1,
});

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
  expect(pendingMarkup.match(/aria-busy="true"/gu)).toHaveLength(1);
  expect(pendingMarkup).toContain('A wird archiviert …');

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
