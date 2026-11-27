import { expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { ListMutation } from '#/shared/ui/list-mutation.ts';
import type { Leistung } from '../services/noten-service.ts';
import {
  type FachSectionContext,
  NotenFachSection,
} from './noten-fach-section.tsx';
import { PlainLeistungLink } from './noten-links.story-fixtures.tsx';
import type { FachGroup } from './noten-list-model.ts';

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
  status: 'graded',
  wert: 2,
});

const group: FachGroup = {
  id: 'mathematik',
  name: 'Mathematik',
  kuerzel: 'M',
  gewichtung: standardgewichtung,
  archived: false,
  leistungen: [note('A'), note('B')],
};

const section = (
  deleteMutation: ListMutation<string>,
  deleteErrors: ReadonlyMap<string, unknown>,
) => {
  const context: FachSectionContext = {
    halbjahr: {
      system: 'sechser',
      startsOn: '2025-08-01',
      endsOn: '2026-01-31',
    },
    today: '2026-01-10',
    link: PlainLeistungLink,
    deleteErrors,
    deleteMutation,
    savedErrors: new Map(),
    landedId: null,
    onAdd: () => undefined,
    onDelete: () => undefined,
    onEdit: () => undefined,
  };
  return renderToStaticMarkup(
    <NotenFachSection context={context} entry={null} group={group} />,
  );
};

/**
 * Was der laufende Vorgang sperrt: in Zeile A das Behalten, denn die Frage
 * steht dort noch und ließe sich sonst zurücknehmen, während schon gelöscht
 * wird; in Zeile B Bearbeiten und Löschen.
 */
const lockedButtons = 1 + 2;

/** Die Zeile A und ihr Löschknopf, an dem „Wird gelöscht …“ steht. */
const busyParts = 2;

it('Der Fachabschnitt sperrt B während A und kündigt As verzögerten Fehler an', async () => {
  const delay = delayedRejection();
  const runFromA = delay.result.catch((cause: unknown) => cause);
  const pendingMarkup = section(pending, new Map());

  expect(pendingMarkup.match(/disabled=""/gu)).toHaveLength(lockedButtons);
  expect(pendingMarkup.match(/aria-busy="true"/gu)).toHaveLength(busyParts);
  expect(pendingMarkup).toContain('<li aria-busy="true"');

  delay.reject(new Error('A ist fehlgeschlagen'));
  const error = await runFromA;
  const errorMarkup = section(
    { error, isError: true, isPending: false, variables: 'A' },
    new Map([['A', error]]),
  );
  const position = errorPosition(errorMarkup);
  expect(position.targetA).toBeGreaterThanOrEqual(0);
  expect(position.alert).toBeGreaterThan(position.targetA);
  expect(position.targetB).toBeGreaterThan(position.alert);
  expect(position.alertCount).toBe(1);
});
