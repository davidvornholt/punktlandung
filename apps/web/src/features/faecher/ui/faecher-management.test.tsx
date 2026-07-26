import { afterAll, describe, expect, it, mock } from 'bun:test';
import type { ReactElement } from 'react';
import { isValidElement } from 'react';

import { restoreFormFocus } from '#/shared/ui/form-focus.ts';

let stateValues: Array<readonly [unknown, (value: unknown) => void]> = [];
const useState = mock((_initial: unknown) => {
  const state = stateValues.shift();
  if (state === undefined) {
    throw new Error('Unerwarteter useState-Aufruf im Komponententest.');
  }
  return state;
});

const rememberTrigger = mock((_trigger: HTMLElement) => undefined);
const formRef = { current: null };
const fallbackTriggerRef = { current: null as HTMLButtonElement | null };

mock.module('react', () => ({ useState }));
mock.module('#/shared/ui/form-focus.ts', () => ({
  restoreFormFocus,
  useFormFocus: () => ({
    fallbackTriggerRef,
    formRef,
    rememberTrigger,
  }),
}));
mock.module('@tanstack/react-query', () => ({
  useMutation: () => ({
    error: null,
    isError: false,
    isPending: false,
    mutate: mock(() => undefined),
    reset: mock(() => undefined),
    variables: undefined,
  }),
  useQuery: () => ({
    data: [],
    isError: false,
    isPending: false,
    refetch: mock(() => undefined),
  }),
  useQueryClient: () => ({
    invalidateQueries: mock(() => Promise.resolve()),
  }),
}));
mock.module('../server/fach-fns.ts', () => ({
  archiveFachFn: mock(() => Promise.resolve()),
  createFachFn: mock(() => Promise.resolve()),
  faecherQueryOptions: (schoolYear: string) => ({
    queryKey: ['faecher', schoolYear],
  }),
  updateFachFn: mock(() => Promise.resolve()),
}));

const { FaecherManagement } = await import('./faecher-management.tsx');

const findElement = (nodes: unknown, type: string): ReactElement => {
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      try {
        return findElement(node, type);
      } catch {
        // Das gesuchte Element kann in einem späteren Geschwister liegen.
      }
    }
  } else if (isValidElement(nodes)) {
    if (nodes.type === type) {
      return nodes;
    }
    return findElement(
      (nodes.props as { readonly children?: unknown }).children,
      type,
    );
  }
  throw new Error(`Kein ${type}-Element gefunden.`);
};

afterAll(() => {
  mock.restore();
});

describe('FaecherManagement', () => {
  it('behält beim Schuljahrwechsel mit offenem Formular den Fokus auf dem Select', () => {
    const schoolYearOptions = {
      focus: mock(() => undefined),
      isConnected: true,
      value: '2026/27',
    } as unknown as HTMLSelectElement;
    const replacementTrigger = {
      focus: mock(() => undefined),
      isConnected: true,
    } as unknown as HTMLButtonElement;
    let returnTarget: HTMLElement | null = null;
    rememberTrigger.mockImplementation((trigger) => {
      returnTarget = trigger;
    });
    fallbackTriggerRef.current = replacementTrigger;
    const setSchoolYear = mock((_value: unknown) => undefined);
    const setEditTarget = mock((value: unknown) => {
      if (value === null) {
        restoreFormFocus(returnTarget, replacementTrigger);
      }
    });
    stateValues = [
      ['2025/26', setSchoolYear],
      ['create', setEditTarget],
    ];

    const view = FaecherManagement({
      schoolYears: ['2025/26', '2026/27'],
    });
    const select = findElement(view, 'select');
    const { onChange } = select.props as {
      readonly onChange: (event: {
        readonly currentTarget: HTMLSelectElement;
      }) => void;
    };
    onChange({ currentTarget: schoolYearOptions });

    expect(rememberTrigger).toHaveBeenCalledWith(schoolYearOptions);
    expect(setEditTarget).toHaveBeenCalledWith(null);
    expect(setSchoolYear).toHaveBeenCalledWith('2026/27');
    expect(schoolYearOptions.focus).toHaveBeenCalledTimes(1);
    expect(replacementTrigger.focus).not.toHaveBeenCalled();
  });
});
