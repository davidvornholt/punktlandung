import { afterAll, describe, expect, it, mock } from 'bun:test';

import { stelleFormularFokusWiederHer } from '#/shared/ui/formular-fokus.ts';
import type { NotenFelder } from '../schemas/note-schema.ts';
import type { NoteMitFach } from '../services/noten-service.ts';

type Knoten = {
  readonly props: Record<string, unknown>;
  readonly type: unknown;
};

type Eigenschaften = Record<string, unknown>;

/** Der Container wertet von einer Note nur ihre Kennung aus. */
const note = (id: string) => ({ id }) as unknown as NoteMitFach;
const noteA = note('note-a');
const noteB = note('note-b');
const felder = { wert: 2 } as unknown as NotenFelder;

/** Der Container hält genau einen Zustand: die gerade bearbeitete Note. */
let zustandspaar: readonly [unknown, (wert: unknown) => void];
const useState = mock(() => zustandspaar);
const merkeAusloeser = mock((_ausloeser: HTMLElement) => undefined);
const ersatzAusloeserRef = { current: null as unknown };
const mutate = mock((_werte: unknown) => undefined);
let aenderungszustand: Eigenschaften = {};
let mutationsoptionen: Array<{
  readonly onSuccess?: (
    ergebnis: unknown,
    werte: { readonly id: string },
  ) => unknown;
}> = [];
let entwertet: Array<ReadonlyArray<string>> = [];

/** Die JSX-Laufzeit braucht die übrigen Ausfuhren; nur useState wird ersetzt. */
const echtesReact = await import('react');

mock.module('#/shared/ui/formular-fokus.ts', () => ({
  stelleFormularFokusWiederHer,
  useFormularFokus: () => ({
    ersatzAusloeserRef,
    formularRef: { current: null },
    merkeAusloeser,
  }),
}));
mock.module('@tanstack/react-query', () => ({
  useMutation: (optionen: never) => {
    const stelle = mutationsoptionen.length;
    mutationsoptionen.push(optionen);
    return {
      error: null,
      isError: false,
      isPending: false,
      mutate,
      reset: () => undefined,
      variables: undefined,
      ...(stelle === 1 ? aenderungszustand : {}),
    };
  },
  useQuery: () => ({
    data: [noteA, noteB],
    isError: false,
    isPending: false,
    refetch: () => undefined,
  }),
  useQueryClient: () => ({
    invalidateQueries: (auswahl: {
      readonly queryKey: ReadonlyArray<string>;
    }) => {
      entwertet.push(auswahl.queryKey);
      return Promise.resolve();
    },
  }),
}));
mock.module('react', () => ({ ...echtesReact, useState }));
mock.module('../server/noten-fns.ts', () => ({
  deleteNoteFn: mock(() => Promise.resolve()),
  notenQueryOptions: (termId: string) => ({ queryKey: ['noten', termId] }),
  updateNoteFn: mock(() => Promise.resolve()),
}));

const { Notenliste } = await import('./notenliste.tsx');

const term = {
  endsOn: '2026-07-31',
  id: 'hj-1',
  startsOn: '2026-01-01',
  system: 'sechser',
} as const;

/** Rendert den Container und legt seine Verdrahtung offen. */
const ansicht = (
  bearbeitung: NoteMitFach | null,
  zustand: Eigenschaften = {},
) => {
  const setBearbeitung = mock((_wert: unknown) => undefined);
  zustandspaar = [bearbeitung, setBearbeitung];
  mutationsoptionen = [];
  aenderungszustand = zustand;
  entwertet = [];
  const karten = (Notenliste({ faecher: [], term }) as unknown as Knoten).props
    .children as Knoten;
  const formular = karten.props.formular as Knoten | null;
  return {
    formular,
    formularEigen:
      formular === null
        ? {}
        : (formular.type as (eigen: unknown) => Knoten)(formular.props).props,
    karten,
    setBearbeitung,
  };
};

const erwarteteSchluessel = [
  ['noten', 'hj-1'],
  ['verlauf'],
  ['zeugnis', 'hj-1'],
];

afterAll(() => {
  mock.restore();
});

describe('Notenliste', () => {
  it('schickt die Kennung der bearbeiteten Note mit der Änderung mit', () => {
    const { formularEigen } = ansicht(noteA);

    (formularEigen.onSpeichern as (werte: NotenFelder) => void)(felder);

    expect(mutate).toHaveBeenCalledWith({ ...felder, id: 'note-a' });
  });

  it('schließt das Formular erst, wenn Noten, Verlauf und Zeugnis entwertet sind', async () => {
    const { setBearbeitung } = ansicht(noteA);

    const lauf = mutationsoptionen[1]?.onSuccess?.(undefined, { id: 'note-a' });
    expect(setBearbeitung).not.toHaveBeenCalled();
    await lauf;

    expect(entwertet).toEqual(erwarteteSchluessel);
    const [schliessen] = setBearbeitung.mock.calls[0] ?? [];
    expect((schliessen as (offen: unknown) => unknown)(noteA)).toBe(null);
  });

  it('lässt eine inzwischen geöffnete andere Note offen', async () => {
    const { setBearbeitung } = ansicht(noteB);

    await mutationsoptionen[1]?.onSuccess?.(undefined, { id: 'note-a' });

    const [schliessen] = setBearbeitung.mock.calls[0] ?? [];
    expect((schliessen as (offen: unknown) => unknown)(noteB)).toBe(noteB);
  });

  it('hält das Formular offen und zeigt den Fehler der gescheiterten Note', () => {
    const error = { _tag: 'X', message: 'Das Halbjahr ist gesperrt.' };
    const gescheitert = {
      error,
      isError: true,
      isPending: true,
      variables: { id: 'note-a' },
    };
    const beiA = ansicht(noteA, gescheitert);
    const beiB = ansicht(noteB, gescheitert);

    expect(beiA.formular).not.toBe(null);
    expect(beiA.formularEigen.fehler).toBe('Das Halbjahr ist gesperrt.');
    expect(beiA.setBearbeitung).not.toHaveBeenCalled();
    expect(beiB.formularEigen.fehler).toBe(null);
    expect(beiB.formularEigen.beschaeftigt).toBe(false);
    expect((beiB.karten.props.aenderung as Eigenschaften).variables).toBe(
      'note-a',
    );
  });

  it('fängt den Fokus auf, wenn der auslösende Zeilenknopf verschwunden ist', () => {
    const { karten, setBearbeitung } = ansicht(noteA);
    const ausloeser = { focus: () => undefined, isConnected: true };
    const ersatz = { focus: mock(() => undefined), isConnected: true };

    (
      karten.props.onBearbeiten as (
        wert: NoteMitFach | null,
        ausloeser: unknown,
      ) => void
    )(null, ausloeser);
    ersatzAusloeserRef.current = ersatz;
    stelleFormularFokusWiederHer(
      { focus: () => undefined, isConnected: false },
      ersatzAusloeserRef.current as { focus: () => void; isConnected: boolean },
    );

    expect(merkeAusloeser).toHaveBeenCalledWith(
      ausloeser as unknown as HTMLElement,
    );
    expect(setBearbeitung).toHaveBeenCalledWith(null);
    expect(ersatz.focus).toHaveBeenCalledTimes(1);
  });
});
