import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { NoteWithFach } from '../services/noten-service.ts';
import { NotenList } from './noten-list.tsx';
import type { NotenOperations } from './noten-operations.ts';

type Outcome = 'failure' | 'success';
/** `ohne-fach…`: jedes Fach des Schuljahrs ist archiviert. */
type Scenario =
  | 'letzte-note'
  | 'ohne-fach-ohne-note'
  | 'ohne-fach'
  | 'standard';

const halbjahr = {
  endsOn: '2027-01-31',
  id: 'hj-1',
  startsOn: '2026-08-01',
  system: 'sechser',
} as const;

const faecher = [
  { id: 'latein', kuerzel: 'L', name: 'Latein' },
  { id: 'mathe', kuerzel: 'M', name: 'Mathematik' },
];

/**
 * Das Fach der Note kommt aus dem gespeicherten Fach, nicht aus der Eingabe:
 * die Liste gruppiert nach `fachId`/`fachName`, geändert wird `subjectId`.
 * Führte die Attrappe das nicht nach, bliebe eine Note beim Fachwechsel
 * scheinbar stehen, wo sie war.
 */
const mitFach = (entry: NoteWithFach, subjectId: string): NoteWithFach => {
  const fach = faecher.find((candidate) => candidate.id === subjectId);
  return fach === undefined
    ? entry
    : {
        ...entry,
        fachId: fach.id,
        fachKuerzel: fach.kuerzel,
        fachName: fach.name,
      };
};

const note = (id: string, wert: number, datum: string): NoteWithFach => ({
  datum,
  fachId: 'latein',
  fachKuerzel: 'L',
  fachName: 'Latein',
  gewicht: 1,
  gewichtung: standardgewichtung,
  id,
  kind: 'klausur',
  notiz: null,
  wert,
});

/* Zwei unterschiedliche Noten, damit die Zeilen auseinanderzuhalten sind. */
const zwei = 2;
const drei = 3;
const noteA = note('note-a', zwei, '2026-09-14');
const noteB = note('note-b', drei, '2026-11-02');

const initialNoten = (scenario: Scenario) => {
  if (scenario === 'ohne-fach-ohne-note') {
    return [];
  }
  return scenario === 'letzte-note' ? [noteA] : [noteA, noteB];
};

const waehlbareFaecher = (scenario: Scenario) =>
  scenario === 'ohne-fach' || scenario === 'ohne-fach-ohne-note' ? [] : faecher;

/**
 * Die Notenliste mit erfundenen Serveraufrufen. Ändern und Löschen hängen an
 * den verborgenen Knöpfen, damit ein Test den Zustand während des laufenden
 * Vorgangs prüfen und den Ausgang selbst bestimmen kann.
 */
export const NotenListStory = ({
  scenario = 'standard',
}: {
  readonly scenario?: Scenario;
}) => {
  const notenRef = useRef<ReadonlyArray<NoteWithFach>>(initialNoten(scenario));
  const settleRef = useRef<((outcome: Outcome) => void) | null>(null);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
          queries: { retry: false },
        },
      }),
  );
  const operations = useMemo<NotenOperations>(() => {
    const awaitOutcome = async () => {
      const outcome = await new Promise<Outcome>((resolve) => {
        settleRef.current = resolve;
      });
      settleRef.current = null;
      return outcome;
    };
    return {
      create: () => Promise.resolve(),
      delete: async (id) => {
        await awaitOutcome();
        notenRef.current = notenRef.current.filter((entry) => entry.id !== id);
      },
      list: () => Promise.resolve(notenRef.current),
      update: async (values) => {
        if ((await awaitOutcome()) === 'failure') {
          throw new Error('Verbindung weg');
        }
        notenRef.current = notenRef.current.map((entry) =>
          entry.id === values.id
            ? mitFach({ ...entry, ...values }, values.subjectId)
            : entry,
        );
      },
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <main className="p-4">
        <NotenList
          faecher={waehlbareFaecher(scenario)}
          halbjahr={halbjahr}
          operations={operations}
        />
      </main>
      <div hidden={true}>
        <button
          data-testid="complete"
          onClick={() => settleRef.current?.('success')}
          type="button"
        />
        <button
          data-testid="fail"
          onClick={() => settleRef.current?.('failure')}
          type="button"
        />
      </div>
    </QueryClientProvider>
  );
};
