import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';

import { HalbjahrDeletionConsequenceChanged } from '../errors/halbjahr-errors.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import type { HalbjahrOperations } from './halbjahr-operations.ts';
import { HalbjahreVerwaltungBoundary } from './halbjahre-verwaltung-boundary.tsx';

type Scenario = 'next' | 'previous' | 'same-row' | 'single' | 'stale';
type DeletionOutcome = 'stale' | 'success';
const fourDigitYearLength = 4;

const createHalbjahr = ({
  half,
  id,
  klassenstufe,
  schoolYear,
}: {
  readonly half: 1 | 2;
  readonly id: string;
  readonly klassenstufe: '10' | 'J1';
  readonly schoolYear: string;
}): HalbjahrWithNotenCount => {
  const startingYear = schoolYear.slice(0, fourDigitYearLength);
  const endingYear = String(Number(startingYear) + 1);
  return {
    endsOn: half === 1 ? `${endingYear}-01-31` : `${endingYear}-07-31`,
    half,
    id,
    klassenstufe,
    notenCount: 0,
    schoolYear,
    startsOn: half === 1 ? `${startingYear}-08-01` : `${endingYear}-02-01`,
    system: klassenstufe === 'J1' ? 'punkte' : 'sechser',
  };
};

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

const initialHalbjahre = (
  scenario: Scenario,
): ReadonlyArray<HalbjahrWithNotenCount> => {
  if (scenario === 'previous') {
    return [neighbor, laterNeighbor, target];
  }
  if (scenario === 'next' || scenario === 'same-row') {
    return [target, neighbor, laterNeighbor];
  }
  if (scenario === 'stale') {
    return [target, sameYearSibling];
  }
  return [target];
};

export const HalbjahreVerwaltungStory = ({
  scenario,
}: {
  readonly scenario: Scenario;
}) => {
  const halbjahreRef = useRef(initialHalbjahre(scenario));
  const settleDeletionRef = useRef<((outcome: DeletionOutcome) => void) | null>(
    null,
  );
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { retry: false },
          queries: { retry: false },
        },
      }),
  );
  const operations = useMemo<HalbjahrOperations>(
    () => ({
      create: () => Promise.resolve(),
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
      list: () => Promise.resolve(halbjahreRef.current),
      update: () => Promise.resolve(),
    }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <main className="p-4">
        <HalbjahreVerwaltungBoundary operations={operations} />
      </main>
      <div hidden={true}>
        <button
          data-testid="complete-deletion"
          onClick={() => settleDeletionRef.current?.('success')}
          type="button"
        />
        <button
          data-testid="reject-stale-deletion"
          onClick={() => settleDeletionRef.current?.('stale')}
          type="button"
        />
      </div>
    </QueryClientProvider>
  );
};
