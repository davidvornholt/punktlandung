import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { halbjahreKey } from '#/shared/query/query-keys.ts';
import {
  type Klassenstufe,
  notensystemForKlassenstufe,
} from '#/shared/school/klassenstufe.ts';
import { halbjahrDateRange } from '#/shared/school/school-year.ts';

import { HalbjahrDeletionConsequenceChanged } from '../errors/halbjahr-errors.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import type { HalbjahrOperations } from './halbjahr-operations.ts';
import { HalbjahreManagementBoundary } from './halbjahre-management-boundary.tsx';

type Scenario =
  | 'laden-scheitert'
  | 'laedt'
  | 'laufbahn'
  | 'leer'
  | 'neuladen-scheitert'
  | 'next'
  | 'previous'
  | 'single'
  | 'speichern-scheitert'
  | 'stale';
type DeletionOutcome = 'stale' | 'success';

const createHalbjahr = ({
  gradedCount,
  half,
  id,
  klassenstufe,
  notenCount = 0,
  schoolYear,
}: {
  /** How many of the Noten have their value; all of them unless said. */
  readonly gradedCount?: number;
  readonly half: 1 | 2;
  readonly id: string;
  readonly klassenstufe: Klassenstufe;
  readonly notenCount?: number;
  readonly schoolYear: string;
}): HalbjahrWithNotenCount => ({
  ...halbjahrDateRange(schoolYear, half),
  gradedCount: gradedCount ?? notenCount,
  half,
  id,
  klassenstufe,
  notenCount,
  schoolYear,
  system: notensystemForKlassenstufe(klassenstufe),
});

const target = createHalbjahr({
  half: 1,
  id: 'target',
  klassenstufe: '10',
  schoolYear: '2026/27',
});
const neighbor = createHalbjahr({
  half: 1,
  id: 'neighbor',
  klassenstufe: 'J1',
  schoolYear: '2027/28',
});
const laterNeighbor = createHalbjahr({
  half: 2,
  id: 'later-neighbor',
  klassenstufe: 'J1',
  schoolYear: '2027/28',
});
const sameYearSibling = createHalbjahr({
  half: 2,
  id: 'same-year-sibling',
  klassenstufe: '10',
  schoolYear: '2026/27',
});

/**
 * Klasse 9 to J1 the way the list arrives, newest first: Noten in every
 * Halbjahr that has begun, a 10.1 that began after the summer holidays instead
 * of on the official day, and a J1.2 that is entered ahead of time and empty.
 */
const laufbahn: ReadonlyArray<HalbjahrWithNotenCount> = [
  createHalbjahr({
    half: 2,
    id: 'j1-2',
    klassenstufe: 'J1',
    schoolYear: '2026/27',
  }),
  createHalbjahr({
    half: 1,
    gradedCount: 12,
    id: 'j1-1',
    klassenstufe: 'J1',
    notenCount: 18,
    schoolYear: '2026/27',
  }),
  createHalbjahr({
    half: 2,
    id: 'zehn-2',
    klassenstufe: '10',
    notenCount: 41,
    schoolYear: '2025/26',
  }),
  {
    ...createHalbjahr({
      half: 1,
      id: 'zehn-1',
      klassenstufe: '10',
      notenCount: 38,
      schoolYear: '2025/26',
    }),
    startsOn: '2025-09-15',
  },
  createHalbjahr({
    half: 2,
    id: 'neun-2',
    klassenstufe: '9',
    notenCount: 44,
    schoolYear: '2024/25',
  }),
  createHalbjahr({
    half: 1,
    id: 'neun-1',
    klassenstufe: '9',
    notenCount: 1,
    schoolYear: '2024/25',
  }),
];

const initialHalbjahre = (
  scenario: Scenario,
): ReadonlyArray<HalbjahrWithNotenCount> => {
  if (scenario === 'laufbahn' || scenario === 'speichern-scheitert') {
    return laufbahn;
  }
  if (scenario === 'leer') {
    return [];
  }
  if (scenario === 'previous') {
    return [neighbor, laterNeighbor, target];
  }
  if (scenario === 'next') {
    return [target, neighbor, laterNeighbor];
  }
  if (scenario === 'stale') {
    return [target, sameYearSibling];
  }
  return [target];
};

const newestFirst = (
  halbjahre: ReadonlyArray<HalbjahrWithNotenCount>,
): ReadonlyArray<HalbjahrWithNotenCount> =>
  [...halbjahre].sort((a, b) => b.startsOn.localeCompare(a.startsOn));

const connectionLost = () => Promise.reject(new Error('Verbindung weg'));

/**
 * A server in memory: it keeps the list, holds a deletion until a test settles
 * it, and fails where the scenario says so.
 */
const useScenario = (scenario: Scenario) => {
  const halbjahreRef = useRef(initialHalbjahre(scenario));
  const readsRef = useRef(0);
  const finishReadRef = useRef<(() => void) | null>(null);
  const settleDeletionRef = useRef<((outcome: DeletionOutcome) => void) | null>(
    null,
  );
  const operations = useMemo<HalbjahrOperations>(() => {
    const saves = scenario !== 'speichern-scheitert';
    return {
      create: (input) => {
        if (!saves) {
          return connectionLost();
        }
        halbjahreRef.current = newestFirst([
          ...halbjahreRef.current,
          createHalbjahr({ ...input, id: `neu-${readsRef.current}` }),
        ]);
        return Promise.resolve();
      },
      delete: async (input) => {
        const outcome = await new Promise<DeletionOutcome>((resolve) => {
          settleDeletionRef.current = resolve;
        });
        settleDeletionRef.current = null;
        if (outcome === 'stale') {
          halbjahreRef.current = halbjahreRef.current.filter(
            (halbjahr) => halbjahr.id !== sameYearSibling.id,
          );
          throw new HalbjahrDeletionConsequenceChanged({
            actualFinalInSchoolYear: true,
            expectedFinalInSchoolYear: input.expectedFinalInSchoolYear,
            halbjahrId: input.id,
          });
        }
        halbjahreRef.current = halbjahreRef.current.filter(
          (halbjahr) => halbjahr.id !== input.id,
        );
      },
      list: () => {
        const read = readsRef.current;
        readsRef.current += 1;
        if (scenario === 'laedt') {
          return new Promise(() => undefined);
        }
        if (scenario === 'laden-scheitert' && read === 0) {
          return connectionLost();
        }
        if (scenario === 'neuladen-scheitert' && read === 1) {
          return connectionLost();
        }
        if (scenario === 'neuladen-scheitert' && read === 2) {
          return new Promise((resolve) => {
            finishReadRef.current = () => resolve(halbjahreRef.current);
          });
        }
        return Promise.resolve(halbjahreRef.current);
      },
      update: (input) => {
        if (!saves) {
          return connectionLost();
        }
        halbjahreRef.current = newestFirst(
          halbjahreRef.current.map((halbjahr) =>
            halbjahr.id === input.id
              ? {
                  ...createHalbjahr(input),
                  ...input,
                  gradedCount: halbjahr.gradedCount,
                  notenCount: halbjahr.notenCount,
                }
              : halbjahr,
          ),
        );
        return Promise.resolve();
      },
    };
  }, [scenario]);
  return { finishReadRef, operations, settleDeletionRef };
};

const HalbjahreManagementScenario = ({
  scenario,
}: {
  readonly scenario: Scenario;
}) => {
  const { finishReadRef, operations, settleDeletionRef } =
    useScenario(scenario);
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
      <main className="p-4">
        <HalbjahreManagementBoundary operations={operations} />
      </main>
      <div hidden={true}>
        <button
          aria-label="Complete deletion"
          data-testid="complete-deletion"
          onClick={() => settleDeletionRef.current?.('success')}
          type="button"
        />
        <button
          aria-label="Reject stale deletion"
          data-testid="reject-stale-deletion"
          onClick={() => settleDeletionRef.current?.('stale')}
          type="button"
        />
        <button
          aria-label="Refetch list"
          data-testid="refetch"
          onClick={() => queryClient.refetchQueries({ queryKey: halbjahreKey })}
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

export const NeuladenScheitert = () => (
  <HalbjahreManagementScenario scenario="neuladen-scheitert" />
);

export const Next = () => <HalbjahreManagementScenario scenario="next" />;

export const Previous = () => (
  <HalbjahreManagementScenario scenario="previous" />
);

export const Single = () => <HalbjahreManagementScenario scenario="single" />;

export const Stale = () => <HalbjahreManagementScenario scenario="stale" />;

/** The first load fails; "Erneut versuchen" then brings the list. */
export const LadenScheitert = () => (
  <HalbjahreManagementScenario scenario="laden-scheitert" />
);

/** The list never arrives. */
export const Laedt = () => <HalbjahreManagementScenario scenario="laedt" />;

/** Six Halbjahre from Klasse 9 to J1, saving and deleting work. */
export const Laufbahn = () => (
  <HalbjahreManagementScenario scenario="laufbahn" />
);

/** A new account: no Halbjahr yet. */
export const Leer = () => <HalbjahreManagementScenario scenario="leer" />;

/** Like `Laufbahn`, but nothing can be saved. */
export const SpeichernScheitert = () => (
  <HalbjahreManagementScenario scenario="speichern-scheitert" />
);
