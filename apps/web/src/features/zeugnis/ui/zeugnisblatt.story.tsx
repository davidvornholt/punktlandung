import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { useRef, useState } from 'react';

import { secondaryButtonClass } from '#/shared/ui/form-classes.ts';
import type { Zeugnis } from '../services/zeugnis-service.ts';
import { punkte, sechser, today } from './zeugnis.story-fixtures.ts';
import { Zeugnisblatt } from './zeugnisblatt.tsx';

/** Was ein Aufruf des Servers tut: liefern, scheitern oder nicht antworten. */
type Answer = 'liefert' | 'scheitert' | 'schweigt';

const zeugnisOf = (halbjahrId: string): Zeugnis =>
  halbjahrId === sechser.termId ? sechser : punkte;

const answer = (kind: Answer, halbjahrId: string): Promise<Zeugnis> => {
  if (kind === 'liefert') {
    return Promise.resolve(zeugnisOf(halbjahrId));
  }
  return kind === 'scheitert'
    ? Promise.reject(new Error('Der Server ist nicht erreichbar.'))
    : new Promise(() => undefined);
};

/**
 * Das Blatt mit einem Server, der der Reihe nach antwortet wie vorgegeben;
 * die letzte Antwort gilt für alle weiteren Aufrufe. Die beiden Knöpfe stehen
 * für das, was auf der Seite die Halbjahr-Auswahl und ein erneutes Laden tun.
 */
const Blatt = ({ answers }: { readonly answers: ReadonlyArray<Answer> }) => {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [halbjahrId, setHalbjahrId] = useState(punkte.termId);
  const callsRef = useRef(0);
  const load = (id: string): Promise<Zeugnis> => {
    const kind = answers[Math.min(callsRef.current, answers.length - 1)];
    callsRef.current += 1;
    return answer(kind ?? 'liefert', id);
  };
  return (
    <QueryClientProvider client={queryClient}>
      <main className="p-4">
        <div className="mb-6 flex gap-2">
          <button
            className={secondaryButtonClass}
            onClick={() => setHalbjahrId(sechser.termId)}
            type="button"
          >
            Anderes Halbjahr
          </button>
          <button
            className={secondaryButtonClass}
            onClick={() => queryClient.invalidateQueries()}
            type="button"
          >
            Neu laden
          </button>
        </div>
        <Zeugnisblatt halbjahrId={halbjahrId} load={load} today={today} />
      </main>
    </QueryClientProvider>
  );
};

/** Die Fächer des Blatts sind Router-Links und brauchen einen Router; ein Speicherverlauf reicht. */
const Scenario = ({ answers }: { readonly answers: ReadonlyArray<Answer> }) => {
  const [router] = useState(() =>
    createRouter({
      history: createMemoryHistory({ initialEntries: ['/'] }),
      routeTree: createRootRoute({
        component: () => <Blatt answers={answers} />,
      }),
    }),
  );
  return <RouterProvider router={router} />;
};

export const Laedt = () => <Scenario answers={['schweigt']} />;

export const ScheitertUndErholtSich = () => (
  <Scenario answers={['scheitert', 'liefert']} />
);

export const AktualisierenScheitert = () => (
  <Scenario answers={['liefert', 'scheitert', 'liefert']} />
);

export const HalbjahrWechsel = () => (
  <Scenario answers={['liefert', 'schweigt']} />
);
