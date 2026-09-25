import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import type { Leistung } from '../services/noten-service.ts';
import { NotenCards } from './noten-cards.tsx';

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

const note = (id: string): Leistung => ({
  datum: id === 'A' ? '2026-01-01' : '2026-01-02',
  fachId: 'mathematik',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  gewicht: 1,
  gewichtung: standardgewichtung,
  id,
  kind: 'klausur',
  notiz: `Ziel ${id}`,
  preparation: null,
  status: 'graded',
  wert: 2,
});

/** Keine Zeile trägt hier einen Änderungsfehler. */
const noUpdateErrors: ReadonlyMap<string, unknown> = new Map();

/** Zwei Zeilen; der laufende Vorgang sperrt in jeder Bearbeiten und Löschen. */
const lockedNoteButtons = 2 * 2;

it('NotenCards sperrt B während A und kündigt As verzögerten Fehler an', async () => {
  const delay = delayedRejection();
  const runFromA = delay.result.catch((cause: unknown) => cause);
  const noten = [note('A'), note('B')];
  const pendingMarkup = renderToStaticMarkup(
    <NotenCards
      deleteErrors={new Map()}
      deleteMutation={pending}
      editNoteId={null}
      editPending={false}
      form={null}
      noten={noten}
      onDelete={() => undefined}
      onEdit={() => undefined}
      preparationLink={() => null}
      system="sechser"
      updateErrors={noUpdateErrors}
    />,
  );

  expect(pendingMarkup.match(/disabled=""/gu)).toHaveLength(lockedNoteButtons);
  expect(pendingMarkup.match(/aria-busy="true"/gu)).toHaveLength(1);

  delay.reject(new Error('A ist fehlgeschlagen'));
  const error = await runFromA;
  const errorMarkup = renderToStaticMarkup(
    <NotenCards
      deleteErrors={new Map([['A', error]])}
      deleteMutation={{
        error,
        isError: true,
        isPending: false,
        variables: 'A',
      }}
      editNoteId={null}
      editPending={false}
      form={null}
      noten={noten}
      onDelete={() => undefined}
      onEdit={() => undefined}
      preparationLink={() => null}
      system="sechser"
      updateErrors={noUpdateErrors}
    />,
  );
  const position = errorPosition(errorMarkup);
  expect(position.targetA).toBeGreaterThanOrEqual(0);
  expect(position.alert).toBeGreaterThan(position.targetA);
  expect(position.targetB).toBeGreaterThan(position.alert);
  expect(position.alertCount).toBe(1);
});
