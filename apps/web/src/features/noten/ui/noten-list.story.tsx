import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { notenKey } from '#/shared/query/query-keys.ts';
import type { Leistung } from '../services/noten-service.ts';
import { PlainLeistungLink } from './noten-links.story-fixtures.tsx';
import { NotenList } from './noten-list.tsx';
import type { NotenListSearch } from './noten-list-model.ts';
import type { NotenOperations } from './noten-operations.ts';

type Outcome = 'failure' | 'success';
/** `ohne-fach…`: jedes Fach des Schuljahrs ist archiviert. */
type Scenario =
  | 'letzte-note'
  | 'neuladen-scheitert'
  | 'ohne-fach-letzte-note'
  | 'ohne-fach-ohne-note'
  | 'ohne-fach'
  | 'standard'
  | 'retry';

const today = '2026-11-26';

const halbjahr = {
  endsOn: '2027-01-31',
  id: 'hj-1',
  startsOn: '2026-08-01',
  system: 'sechser',
} as const;

/** Kunst hat keine Leistung: so sieht ein Fach aus, in dem noch nichts eingetragen ist. */
const faecher = [
  { id: 'latein', shortName: 'L', name: 'Latein' },
  { id: 'mathe', shortName: 'M', name: 'Mathematik' },
  { id: 'kunst', shortName: 'Ku', name: 'Kunst' },
].map((fach) => ({ ...fach, gewichtung: standardgewichtung }));

/**
 * Das Fach der Note kommt aus dem gespeicherten Fach, nicht aus der Eingabe:
 * die Liste gruppiert nach `fachId`/`fachName`, geändert wird `subjectId`.
 * Führte die Attrappe das nicht nach, bliebe eine Note beim Fachwechsel
 * scheinbar stehen, wo sie war.
 */
const mitFach = (entry: Leistung, subjectId: string): Leistung => {
  const fach = faecher.find((candidate) => candidate.id === subjectId);
  return fach === undefined
    ? entry
    : {
        ...entry,
        fachId: fach.id,
        fachKuerzel: fach.shortName,
        fachName: fach.name,
      };
};

const note = (id: string, wert: number, datum: string): Leistung => ({
  datum,
  fachId: 'latein',
  fachKuerzel: 'L',
  fachName: 'Latein',
  gewicht: 1,
  gewichtung: standardgewichtung,
  id,
  kind: 'klausur',
  notiz: null,
  status: 'graded',
  wert,
});

/* Unterschiedliche Noten, damit die Zeilen auseinanderzuhalten sind. */
const werte = { a: 2, b: 3, c: 2.5 } as const;
const noteA = note('note-a', werte.a, '2026-09-14');
const noteB = note('note-b', werte.b, '2026-11-02');
/** Eine Note in einem zweiten Fach: ihr Eintrag lässt sich öffnen, während der einer Lateinnote noch läuft. */
const noteC = mitFach(note('note-c', werte.c, '2026-10-05'), 'mathe');

const initialNoten = (scenario: Scenario): ReadonlyArray<Leistung> => {
  if (scenario === 'ohne-fach-ohne-note') {
    return [];
  }
  if (scenario === 'letzte-note' || scenario === 'ohne-fach-letzte-note') {
    return [noteA];
  }
  return [noteA, noteB, noteC];
};

const waehlbareFaecher = (scenario: Scenario) =>
  scenario.startsWith('ohne-fach') ? [] : faecher;

type Hooks = {
  readonly settle: (outcome: Outcome) => void;
  readonly settleById: (id: string, outcome: Outcome) => void;
  readonly finishRead: () => void;
};

/**
 * Erfundene Serveraufrufe. Schreiben wartet, bis ein Test den Ausgang
 * bestimmt, damit sich der Zustand während des laufenden Vorgangs prüfen
 * lässt.
 */
const useOperations = (
  scenario: Scenario,
): { readonly operations: NotenOperations; readonly hooks: Hooks } => {
  const notenRef = useRef(initialNoten(scenario));
  const lastRef = useRef<((outcome: Outcome) => void) | null>(null);
  const pendingByIdRef = useRef(new Map<string, (outcome: Outcome) => void>());
  const readsRef = useRef(0);
  const finishReadRef = useRef<(() => void) | null>(null);
  const operations = useMemo<NotenOperations>(() => {
    const succeeds = async (id: string): Promise<void> => {
      const outcome = await new Promise<Outcome>((resolve) => {
        lastRef.current = resolve;
        pendingByIdRef.current.set(id, resolve);
      });
      lastRef.current = null;
      pendingByIdRef.current.delete(id);
      if (outcome === 'failure') {
        throw new Error('Verbindung weg');
      }
    };
    const written = (
      id: string,
      { subjectId, wert, ...fields }: Parameters<NotenOperations['update']>[0],
    ): Leistung => {
      const base = {
        ...fields,
        fachId: 'latein',
        fachKuerzel: 'L',
        fachName: 'Latein',
        gewichtung: standardgewichtung,
        id,
      };
      return mitFach(
        wert === null
          ? { ...base, status: 'planned' }
          : { ...base, status: 'graded', wert },
        subjectId,
      );
    };
    return {
      create: async (values) => {
        await succeeds(values.id);
        notenRef.current = [...notenRef.current, written(values.id, values)];
      },
      delete: async (id) => {
        await succeeds(id);
        notenRef.current = notenRef.current.filter((entry) => entry.id !== id);
      },
      list: () => {
        const read = readsRef.current;
        readsRef.current += 1;
        if (
          (scenario === 'retry' && read === 0) ||
          (scenario === 'neuladen-scheitert' && read === 1)
        ) {
          return Promise.reject(new Error('Verbindung weg'));
        }
        if (scenario === 'neuladen-scheitert' && read === 2) {
          return new Promise((resolve) => {
            finishReadRef.current = () => resolve(notenRef.current);
          });
        }
        return Promise.resolve(notenRef.current);
      },
      update: async (values) => {
        await succeeds(values.id);
        notenRef.current = notenRef.current.map((entry) =>
          entry.id === values.id ? written(values.id, values) : entry,
        );
      },
    };
  }, [scenario]);
  return {
    operations,
    hooks: {
      settle: (outcome) => lastRef.current?.(outcome),
      settleById: (id, outcome) => pendingByIdRef.current.get(id)?.(outcome),
      finishRead: () => finishReadRef.current?.(),
    },
  };
};

/** Was ein Test auslöst, ohne dass es auf der Seite zu sehen ist. */
const Controls = ({
  hooks,
  onRefetch,
}: {
  readonly hooks: Hooks;
  readonly onRefetch: () => void;
}) => (
  <div hidden={true}>
    {(['note-a', 'note-c'] as const).map((id) => (
      <button
        data-testid={`complete-${id.slice(-1)}`}
        key={id}
        onClick={() => hooks.settleById(id, 'success')}
        type="button"
      >
        Complete {id}
      </button>
    ))}
    <button
      aria-label="Complete save"
      data-testid="complete"
      onClick={() => hooks.settle('success')}
      type="button"
    />
    <button
      aria-label="Fail save"
      data-testid="fail"
      onClick={() => hooks.settle('failure')}
      type="button"
    />
    <button
      aria-label="Finish list read"
      data-testid="finish-read"
      onClick={hooks.finishRead}
      type="button"
    />
    <button
      aria-label="Refetch list"
      data-testid="refetch"
      onClick={onRefetch}
      type="button"
    />
  </div>
);

const noSearch: NotenListSearch = {};

/**
 * Die Notenliste mit erfundenen Serveraufrufen. Die Adresse der Seite ist ein
 * Zustand der Geschichte; `data-testid="search"` zeigt, was in ihr stünde.
 */
const NotenListScenario = ({
  scenario,
  search: initialSearch = noSearch,
}: {
  readonly scenario: Scenario;
  readonly search?: NotenListSearch;
}) => {
  const [search, setSearch] = useState(initialSearch);
  const { hooks, operations } = useOperations(scenario);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
          queries: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <main className="mx-auto max-w-[75rem] p-4 desk:px-6">
        <NotenList
          faecher={waehlbareFaecher(scenario)}
          halbjahr={halbjahr}
          link={PlainLeistungLink}
          onSearch={setSearch}
          operations={operations}
          search={search}
          today={today}
        />
      </main>
      <output data-testid="search" hidden={true}>
        {JSON.stringify(search)}
      </output>
      <button
        data-testid="ask-new"
        hidden={true}
        onClick={() => setSearch({ neu: true })}
        type="button"
      >
        Neue Note
      </button>
      <Controls
        hooks={hooks}
        onRefetch={() =>
          queryClient.refetchQueries({ queryKey: notenKey(halbjahr.id) })
        }
      />
    </QueryClientProvider>
  );
};

export const Standard = () => <NotenListScenario scenario="standard" />;

/** Die Adresse verlangt eine neue Note, ohne ein Fach zu nennen. */
export const Neu = () => (
  <NotenListScenario scenario="standard" search={{ neu: true }} />
);

export const LetzteNote = () => <NotenListScenario scenario="letzte-note" />;

export const OhneFach = () => <NotenListScenario scenario="ohne-fach" />;

export const OhneFachLetzteNote = () => (
  <NotenListScenario scenario="ohne-fach-letzte-note" />
);

export const OhneFachOhneNote = () => (
  <NotenListScenario scenario="ohne-fach-ohne-note" />
);

export const Retry = () => <NotenListScenario scenario="retry" />;

export const NeuladenScheitert = () => (
  <NotenListScenario scenario="neuladen-scheitert" />
);
