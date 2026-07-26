import { afterAll, describe, expect, it, mock } from 'bun:test';

import { restoreFormFocus } from '#/shared/ui/form-focus.ts';
import type { NotenFields } from '../schemas/note-schema.ts';
import type { NoteWithFach } from '../services/noten-service.ts';

type Node = {
  readonly props: Record<string, unknown>;
  readonly type: unknown;
};

type Props = Record<string, unknown>;

/** Der Container wertet von einer Note nur ihre Kennung aus. */
const note = (id: string) => ({ id }) as unknown as NoteWithFach;
const noteA = note('note-a');
const noteB = note('note-b');
const fields = { wert: 2 } as unknown as NotenFields;

/** Der Container hält genau einen Zustand: die gerade bearbeitete Note. */
let statePair: readonly [unknown, (value: unknown) => void];
const useState = mock(() => statePair);
const rememberTrigger = mock((_trigger: HTMLElement) => undefined);
const fallbackTriggerRef = { current: null as unknown };
const mutate = mock((_values: unknown) => undefined);
let updateState: Props = {};
let mutationOptions: Array<{
  readonly onSuccess?: (
    result: unknown,
    values: { readonly id: string },
  ) => unknown;
}> = [];
let invalidated: Array<ReadonlyArray<string>> = [];

/** Die JSX-Laufzeit braucht die übrigen Ausfuhren; nur useState wird ersetzt. */
const actualReact = await import('react');

mock.module('#/shared/ui/form-focus.ts', () => ({
  restoreFormFocus,
  useFormFocus: () => ({
    fallbackTriggerRef,
    formRef: { current: null },
    rememberTrigger,
  }),
}));
mock.module('@tanstack/react-query', () => ({
  useMutation: (options: never) => {
    const position = mutationOptions.length;
    mutationOptions.push(options);
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
      return Promise.resolve();
    },
  }),
}));
mock.module('react', () => ({ ...actualReact, useState }));
mock.module('../server/noten-fns.ts', () => ({
  deleteNoteFn: mock(() => Promise.resolve()),
  notenQueryOptions: (termId: string) => ({ queryKey: ['noten', termId] }),
  updateNoteFn: mock(() => Promise.resolve()),
}));

const { NotenList } = await import('./noten-list.tsx');

const halbjahr = {
  endsOn: '2026-07-31',
  id: 'hj-1',
  startsOn: '2026-01-01',
  system: 'sechser',
} as const;

/** Rendert den Container und legt seine Verdrahtung offen. */
const view = (editTarget: NoteWithFach | null, state: Props = {}) => {
  const setEditTarget = mock((_value: unknown) => undefined);
  statePair = [editTarget, setEditTarget];
  mutationOptions = [];
  updateState = state;
  invalidated = [];
  const cards = (NotenList({ faecher: [], halbjahr }) as unknown as Node).props
    .children as Node;
  const form = cards.props.form as Node | null;
  return {
    cards,
    form,
    formProps:
      form === null
        ? {}
        : (form.type as (props: unknown) => Node)(form.props).props,
    setEditTarget,
  };
};

const expectedKeys = [['noten', 'hj-1'], ['trend'], ['zeugnis', 'hj-1']];

afterAll(() => {
  mock.restore();
});

describe('NotenList', () => {
  it('schickt die Kennung der bearbeiteten Note mit der Änderung mit', () => {
    const { formProps } = view(noteA);

    (formProps.onSave as (values: NotenFields) => void)(fields);

    expect(mutate).toHaveBeenCalledWith({ ...fields, id: 'note-a' });
  });

  it('schließt das Formular erst, wenn Noten, Verlauf und Zeugnis entwertet sind', async () => {
    const { setEditTarget } = view(noteA);

    const running = mutationOptions[1]?.onSuccess?.(undefined, {
      id: 'note-a',
    });
    expect(setEditTarget).not.toHaveBeenCalled();
    await running;

    expect(invalidated).toEqual(expectedKeys);
    const [close] = setEditTarget.mock.calls[0] ?? [];
    expect((close as (open: unknown) => unknown)(noteA)).toBe(null);
  });

  it('lässt eine inzwischen geöffnete andere Note offen', async () => {
    const { setEditTarget } = view(noteB);

    await mutationOptions[1]?.onSuccess?.(undefined, { id: 'note-a' });

    const [close] = setEditTarget.mock.calls[0] ?? [];
    expect((close as (open: unknown) => unknown)(noteB)).toBe(noteB);
  });

  it('hält das Formular offen und zeigt den Fehler der gescheiterten Note', () => {
    const error = { _tag: 'X', message: 'Das Halbjahr ist gesperrt.' };
    const failed = {
      error,
      isError: true,
      isPending: true,
      variables: { id: 'note-a' },
    };
    const atA = view(noteA, failed);
    const atB = view(noteB, failed);

    expect(atA.form).not.toBe(null);
    expect(atA.formProps.error).toBe('Das Halbjahr ist gesperrt.');
    expect(atA.setEditTarget).not.toHaveBeenCalled();
    expect(atB.formProps.error).toBe(null);
    expect(atB.formProps.pending).toBe(false);
    expect((atB.cards.props.updateMutation as Props).variables).toBe('note-a');
  });

  it('fängt den Fokus auf, wenn der auslösende Zeilenknopf verschwunden ist', () => {
    const { cards, setEditTarget } = view(noteA);
    const trigger = { focus: () => undefined, isConnected: true };
    const fallback = { focus: mock(() => undefined), isConnected: true };

    (
      cards.props.onEdit as (
        value: NoteWithFach | null,
        trigger: unknown,
      ) => void
    )(null, trigger);
    fallbackTriggerRef.current = fallback;
    restoreFormFocus(
      { focus: () => undefined, isConnected: false },
      fallbackTriggerRef.current as {
        focus: () => void;
        isConnected: boolean;
      },
    );

    expect(rememberTrigger).toHaveBeenCalledWith(
      trigger as unknown as HTMLElement,
    );
    expect(setEditTarget).toHaveBeenCalledWith(null);
    expect(fallback.focus).toHaveBeenCalledTimes(1);
  });
});
