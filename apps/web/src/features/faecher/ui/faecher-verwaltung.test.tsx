import { afterAll, describe, expect, it, mock } from 'bun:test';
import type { ReactElement } from 'react';
import { isValidElement } from 'react';

import { stelleFormularFokusWiederHer } from '#/shared/ui/formular-fokus.ts';

let zustandswerte: Array<readonly [unknown, (wert: unknown) => void]> = [];
const useState = mock((_initial: unknown) => {
  const zustand = zustandswerte.shift();
  if (zustand === undefined) {
    throw new Error('Unerwarteter useState-Aufruf im Komponententest.');
  }
  return zustand;
});

const merkeAusloeser = mock((_ausloeser: HTMLElement) => undefined);
const formularRef = { current: null };
const ersatzAusloeserRef = { current: null as HTMLButtonElement | null };

mock.module('react', () => ({ useState }));
mock.module('#/shared/ui/formular-fokus.ts', () => ({
  stelleFormularFokusWiederHer,
  useFormularFokus: () => ({
    ersatzAusloeserRef,
    formularRef,
    merkeAusloeser,
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

const { FaecherVerwaltung } = await import('./faecher-verwaltung.tsx');

const findeElement = (knoten: unknown, typ: string): ReactElement => {
  if (Array.isArray(knoten)) {
    for (const kind of knoten) {
      try {
        return findeElement(kind, typ);
      } catch {
        // Das gesuchte Element kann in einem späteren Geschwister liegen.
      }
    }
  } else if (isValidElement(knoten)) {
    if (knoten.type === typ) {
      return knoten;
    }
    return findeElement(
      (knoten.props as { readonly children?: unknown }).children,
      typ,
    );
  }
  throw new Error(`Kein ${typ}-Element gefunden.`);
};

afterAll(() => {
  mock.restore();
});

describe('FaecherVerwaltung', () => {
  it('behält beim Schuljahrwechsel mit offenem Formular den Fokus auf dem Select', () => {
    const schuljahrAuswahl = {
      focus: mock(() => undefined),
      isConnected: true,
      value: '2026/27',
    } as unknown as HTMLSelectElement;
    const ersatzAusloeser = {
      focus: mock(() => undefined),
      isConnected: true,
    } as unknown as HTMLButtonElement;
    let rueckkehrziel: HTMLElement | null = null;
    merkeAusloeser.mockImplementation((ausloeser) => {
      rueckkehrziel = ausloeser;
    });
    ersatzAusloeserRef.current = ersatzAusloeser;
    const setSchoolYear = mock((_wert: unknown) => undefined);
    const setBearbeitung = mock((wert: unknown) => {
      if (wert === null) {
        stelleFormularFokusWiederHer(rueckkehrziel, ersatzAusloeser);
      }
    });
    zustandswerte = [
      ['2025/26', setSchoolYear],
      ['neu', setBearbeitung],
    ];

    const ansicht = FaecherVerwaltung({
      schoolYears: ['2025/26', '2026/27'],
    });
    const select = findeElement(ansicht, 'select');
    const { onChange } = select.props as {
      readonly onChange: (ereignis: {
        readonly currentTarget: HTMLSelectElement;
      }) => void;
    };
    onChange({ currentTarget: schuljahrAuswahl });

    expect(merkeAusloeser).toHaveBeenCalledWith(schuljahrAuswahl);
    expect(setBearbeitung).toHaveBeenCalledWith(null);
    expect(setSchoolYear).toHaveBeenCalledWith('2026/27');
    expect(schuljahrAuswahl.focus).toHaveBeenCalledTimes(1);
    expect(ersatzAusloeser.focus).not.toHaveBeenCalled();
  });
});
