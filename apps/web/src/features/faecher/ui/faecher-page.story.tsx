import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { faecherKey, halbjahreKey } from '#/shared/query/query-keys.ts';
import type { Fach } from '../services/fach-service.ts';
import { FaecherPage, type FaecherPageOperations } from './faecher-page.tsx';

type Scenario = 'faecher' | 'halbjahre' | 'halbjahre-erstes-laden';

const schoolYear = '2026/27';
const halbjahre = [{ schoolYear, system: 'sechser' }] as const;
const faecher: ReadonlyArray<Fach> = [
  {
    gewichtung: standardgewichtung,
    id: 'mathe',
    name: 'Mathematik',
    shortName: 'M',
    sortOrder: 0,
  },
];

const FaecherPageScenario = ({ scenario }: { readonly scenario: Scenario }) => {
  const readsRef = useRef(0);
  const finishReadRef = useRef<(() => void) | null>(null);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
          queries: { retry: false },
        },
      }),
  );
  const operations = useMemo<FaecherPageOperations>(() => {
    const firstLoad = scenario === 'halbjahre-erstes-laden';
    const failingQuery = firstLoad ? 'halbjahre' : scenario;
    const failingRead = firstLoad ? 0 : 1;
    const read = <T,>(own: Scenario, value: T): Promise<T> => {
      if (own !== failingQuery) {
        return Promise.resolve(value);
      }
      const count = readsRef.current;
      readsRef.current += 1;
      if (count === failingRead) {
        return Promise.reject(new Error('Verbindung weg'));
      }
      if (count === failingRead + 1) {
        return new Promise((resolve) => {
          finishReadRef.current = () => resolve(value);
        });
      }
      return Promise.resolve(value);
    };
    return {
      archive: () => Promise.resolve(),
      create: () => new Promise(() => undefined),
      list: () => read('faecher', faecher),
      listHalbjahre: () => read('halbjahre', halbjahre),
      update: () => Promise.resolve(),
    };
  }, [scenario]);

  return (
    <QueryClientProvider client={queryClient}>
      <main className="p-4">
        <FaecherPage operations={operations} />
      </main>
      <div hidden={true}>
        <button
          aria-label="Refetch"
          data-testid="refetch"
          onClick={() =>
            queryClient.refetchQueries({
              queryKey:
                scenario === 'faecher' ? faecherKey(schoolYear) : halbjahreKey,
            })
          }
          type="button"
        />
        <button
          aria-label="Finish read"
          data-testid="finish-read"
          onClick={() => finishReadRef.current?.()}
          type="button"
        />
      </div>
    </QueryClientProvider>
  );
};

export const FaecherNeuladenScheitert = () => (
  <FaecherPageScenario scenario="faecher" />
);

export const HalbjahreNeuladenScheitert = () => (
  <FaecherPageScenario scenario="halbjahre" />
);

export const HalbjahreErstesLadenScheitert = () => (
  <FaecherPageScenario scenario="halbjahre-erstes-laden" />
);
