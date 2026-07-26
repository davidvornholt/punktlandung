import { mock } from 'bun:test';

import type { NotenFields } from '../schemas/note-schema.ts';
import type { NoteWithFach } from '../services/noten-service.ts';

/**
 * Prüfstand für den Notenlisten-Container. Beide Testdateien teilen ihn, weil
 * sie denselben Container an denselben Ersatzbausteinen aufhängen; eine Kopie
 * je Datei driftete auseinander.
 */

/** Der Container wertet von einer Note nur ihre Kennung aus. */
const note = (id: string) => ({ id }) as unknown as NoteWithFach;

export const noteA = note('note-a');
export const noteB = note('note-b');
export const fields = { wert: 2 } as unknown as NotenFields;

export const halbjahr = {
  endsOn: '2026-07-31',
  id: 'hj-1',
  startsOn: '2026-01-01',
  system: 'sechser',
} as const;

/** Was jede Notenmutation entwerten muss. */
export const expectedKeys = [['noten', 'hj-1'], ['trend'], ['zeugnis']];

/** Ein gerendertes Element, so weit der Prüfstand es auswertet. */
export type Node = {
  readonly key: string | null;
  readonly props: Record<string, unknown>;
  readonly type: unknown;
};

export type Props = Record<string, unknown>;

/** Die Rückrufe, die der Container an eine Mutation hängt. */
type MutationHooks = {
  readonly onError?: (error: unknown, values: never) => unknown;
  readonly onSuccess?: (result: unknown, values: never) => Promise<unknown>;
};

/** Zustände in Aufrufreihenfolge: bearbeitete Note, dann Änderungsfehler. */
let states: ReadonlyArray<readonly [unknown, unknown]> = [];
let stateCall = 0;
const useState = mock(() => {
  const current = states[stateCall];
  stateCall += 1;
  return current;
});

const hooks: Array<MutationHooks> = [];
const resolvers: Array<() => void> = [];

/** Der Ersatzauslöser, den der Container an sein Auffangziel hängen soll. */
export const fallbackTriggerRef = { current: null as unknown };
export const rememberTrigger = mock((_trigger: HTMLElement) => undefined);
export const mutate = mock((_values: unknown) => undefined);
export const invalidated: Array<ReadonlyArray<string>> = [];

let updateState: Props = {};

/** Gibt alle noch offenen Entwertungen frei. */
export const releaseInvalidations = () => {
  for (const resolve of resolvers.splice(0)) {
    resolve();
  }
};

const actualReact = await import('react');
const actualQuery = await import('@tanstack/react-query');
const actualFormFocus = await import('#/shared/ui/form-focus.ts');

/**
 * Hängt die Ersatzbausteine ein; jede Testdatei ruft das erneut auf, falls eine
 * zuvor gelaufene sie zurückgesetzt hat. Bun hält Modulattrappen prozessweit
 * und die zuletzt eingehängte gilt: jede Attrappe legt sich darum über das
 * echte Modul und führt jeden Export, sonst nähme sie ihn jeder später
 * laufenden Testdatei weg.
 */
export const installNotenListMocks = () => {
  mock.module('#/shared/ui/form-focus.ts', () => ({
    ...actualFormFocus,
    useFormFocus: () => ({
      fallbackTriggerRef,
      formRef: { current: null },
      rememberTrigger,
    }),
  }));
  mock.module('@tanstack/react-query', () => ({
    ...actualQuery,
    useMutation: (options: never) => {
      const position = hooks.length;
      hooks.push(options);
      return {
        error: null,
        isError: false,
        isPending: false,
        mutate,
        reset: () => undefined,
        variables: undefined,
        ...(position === 1 ? updateState : {}),
      };
    },
    useQuery: () => ({
      data: [noteA, noteB],
      isError: false,
      isPending: false,
      refetch: () => undefined,
    }),
    useQueryClient: () => ({
      invalidateQueries: (selection: {
        readonly queryKey: ReadonlyArray<string>;
      }) => {
        invalidated.push(selection.queryKey);
        return new Promise<void>((resolve) => {
          resolvers.push(resolve);
        });
      },
    }),
  }));
  mock.module('react', () => ({ ...actualReact, useState }));
  /* createNoteFn nutzt der Container nicht, andere Testdateien aber schon. */
  mock.module('../server/noten-fns.ts', () => ({
    createNoteFn: mock(() => Promise.resolve()),
    deleteNoteFn: mock(() => Promise.resolve()),
    notenQueryOptions: (termId: string) => ({ queryKey: ['noten', termId] }),
    updateNoteFn: mock(() => Promise.resolve()),
  }));
};

/**
 * Setzt die geteilten Module wieder auf die echten. `mock.restore()` nimmt
 * Modulattrappen nicht zurück, sie gelten prozessweit weiter — ohne das hier
 * liefe jede später gestartete Testdatei gegen React und den Abfragespeicher
 * dieses Prüfstands. Die Serverfunktionen bleiben ersetzt, weil sie beim Laden
 * die Umgebung lesen und sich in einem Test nicht echt einbinden lassen.
 */
export const restoreNotenListMocks = () => {
  mock.module('#/shared/ui/form-focus.ts', () => actualFormFocus);
  mock.module('react', () => actualReact);
  mock.module('@tanstack/react-query', () => actualQuery);
};

installNotenListMocks();

const { NotenList } = await import('./noten-list.tsx');

/** Meldet den Ausgang eines Speichervorgangs an den Container zurück. */
export const finishUpdate = (id: string) =>
  hooks[1]?.onSuccess?.(undefined, { id } as never);

export const failUpdate = (error: unknown, id: string) =>
  hooks[1]?.onError?.(error, { id } as never);

export const finishDelete = (id: string) =>
  hooks[0]?.onSuccess?.(undefined, id as never);

/** Rendert den Container und legt seine Verdrahtung offen. */
export const view = (
  editTarget: NoteWithFach | null,
  updateErrors: ReadonlyMap<string, unknown> = new Map(),
  update: Props = {},
) => {
  const setEditTarget = mock((_value: unknown) => undefined);
  const setUpdateErrors = mock((_value: unknown) => undefined);
  states = [
    [editTarget, setEditTarget],
    [updateErrors, setUpdateErrors],
  ];
  stateCall = 0;
  updateState = update;
  hooks.length = 0;
  invalidated.length = 0;
  resolvers.length = 0;
  mutate.mockClear();
  rememberTrigger.mockClear();
  const root = NotenList({ faecher: [], halbjahr }) as unknown as Node;
  const cards = root.props.children as Node;
  const form = cards.props.form as Node | null;
  return {
    cards,
    form,
    formProps: form === null ? {} : (form.props as Props),
    root,
    setEditTarget,
    setUpdateErrors,
  };
};

/**
 * Das gerenderte Formular, wenn der Container eines gerendert hat. Scheitert
 * laut, statt einen fehlenden Knoten still als bestandene Zusicherung
 * durchgehen zu lassen.
 */
export const requireForm = (rendered: { readonly form: Node | null }): Node => {
  if (rendered.form === null) {
    throw new Error('Der Container hat kein Formular gerendert.');
  }
  return rendered.form;
};

/** Der Auffangknopf der Liste, wie ihn der Container gesetzt haben muss. */
export const fallbackTarget = (root: Node) =>
  root.props.ref as { current: unknown };

/** Ruft `onEdit` der Karten auf, wie es ein Zeilenknopf täte. */
export const edit = (
  cards: Node,
  target: NoteWithFach | null,
  trigger: unknown,
) =>
  (cards.props.onEdit as (note: NoteWithFach | null, trigger: unknown) => void)(
    target,
    trigger,
  );
