import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import type { StudyRecency } from '#/shared/lernen/study-recency.ts';
import type { StudyDayInput } from '../schemas/study-day-schema.ts';
import { LearnedForLeistung } from './learned-for-leistung.tsx';

type Scenario = 'nie' | 'heute' | 'vor-tagen';

const recency = (scenario: Scenario): StudyRecency => {
  if (scenario === 'nie') {
    return { daysAgo: null, inLastWeek: 0 };
  }
  return scenario === 'heute'
    ? { daysAgo: 0, inLastWeek: 3 }
    : { daysAgo: 4, inLastWeek: 1 };
};

/** Der Lerntag-Baustein mit erfundenem Serveraufruf; der letzte Aufruf steht im DOM. */
const LearnedForLeistungScenario = ({
  scenario,
}: {
  readonly scenario: Scenario;
}) => {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
  );
  const [logged, setLogged] = useState<StudyDayInput | null>(null);
  return (
    <QueryClientProvider client={queryClient}>
      <main className="p-4">
        <LearnedForLeistung
          fachId="mathe"
          leistungId="k-1"
          lernen={recency(scenario)}
          log={(input) => {
            setLogged(input);
            return Promise.resolve();
          }}
        />
      </main>
      <output aria-label="Eingetragener Lerntag">
        {logged === null ? '' : JSON.stringify(logged)}
      </output>
    </QueryClientProvider>
  );
};

/** Für diese Leistung wurde noch nie gelernt. */
export const Nie = () => <LearnedForLeistungScenario scenario="nie" />;

/** Heute wurde schon dafür gelernt. */
export const Heute = () => <LearnedForLeistungScenario scenario="heute" />;

/** Zuletzt wurde vor vier Tagen dafür gelernt. */
export const VorTagen = () => (
  <LearnedForLeistungScenario scenario="vor-tagen" />
);
