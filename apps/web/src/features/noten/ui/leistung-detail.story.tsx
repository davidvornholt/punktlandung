import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { useState } from 'react';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { leistungKeyPrefix } from '#/shared/query/query-keys.ts';
import { parseLeistungSearch } from '#/shared/ui/page-search.ts';
import type {
  LeistungDetail as Detail,
  Leistung,
} from '../services/noten-service.ts';
import { LeistungDetail } from './leistung-detail.tsx';
import type { LeistungOperations } from './leistung-operations.ts';
import type { NotenOperations } from './noten-operations.ts';

/** The day the stories take place on. */
const today = '2026-11-26';

const halbjahrOf = (system: Notensystem): Detail['halbjahr'] => ({
  endsOn: '2027-01-31',
  id: 'hj-1',
  label: system === 'punkte' ? 'J1.1' : '9.1',
  schoolYear: '2026/27',
  startsOn: '2026-09-01',
  system,
});

const faecher = [
  {
    id: 'mathe',
    name: 'Mathematik',
    shortName: 'M',
    gewichtung: standardgewichtung,
  },
  {
    id: 'englisch',
    name: 'Englisch',
    shortName: 'E',
    gewichtung: standardgewichtung,
  },
];

const inMathe = {
  fachId: 'mathe',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  gewicht: 1,
  gewichtung: standardgewichtung,
  notiz: null,
} as const;

const inEnglisch = {
  ...inMathe,
  fachId: 'englisch',
  fachKuerzel: 'E',
  fachName: 'Englisch',
} as const;

type Scenario =
  | 'ausstehend'
  | 'benotet'
  | 'fehlt'
  | 'allein'
  | 'ohneAnteil'
  | 'sechser';

/** The Leistung the page is about. */
const own: Readonly<Record<Scenario, Leistung>> = {
  ausstehend: {
    ...inMathe,
    id: 'k-1',
    kind: 'klausur',
    datum: '2026-12-08',
    status: 'planned',
  },
  benotet: {
    ...inMathe,
    id: 'k-1',
    kind: 'klausur',
    datum: '2026-11-16',
    notiz: 'Analysis',
    status: 'graded',
    wert: 8,
  },
  fehlt: {
    ...inMathe,
    id: 'k-1',
    kind: 'klausur',
    datum: '2026-11-12',
    status: 'planned',
  },
  allein: {
    ...inMathe,
    id: 'k-1',
    kind: 'klausur',
    datum: '2026-11-16',
    status: 'graded',
    wert: 8,
  },
  ohneAnteil: {
    ...inMathe,
    gewichtung: {
      ...standardgewichtung,
      verhaeltnis: { schriftlich: 0, muendlich: 1 },
    },
    id: 'k-1',
    kind: 'klausur',
    datum: '2026-11-16',
    status: 'graded',
    wert: 12,
  },
  sechser: {
    ...inMathe,
    id: 'k-1',
    kind: 'klausur',
    datum: '2026-11-16',
    status: 'graded',
    wert: 3,
  },
};

/** The Noten of the other Leistungen, in each Notensystem. */
const noten = {
  punkte: { k2: 12, t1: 10, m1: 10, e1: 9 },
  sechser: { k2: 2, t1: 2.5, m1: 2.5, e1: 3 },
} as const;

/** The other Leistungen of the Halbjahr: three with a Note and one that waits in Mathematik, one in Englisch. */
const othersOf = (scenario: Scenario): ReadonlyArray<Leistung> => {
  if (scenario === 'allein' || scenario === 'ohneAnteil') {
    return [];
  }
  const wert = noten[scenario === 'sechser' ? 'sechser' : 'punkte'];
  return [
    {
      ...inMathe,
      id: 'k-2',
      kind: 'klausur',
      datum: '2026-09-28',
      status: 'graded',
      wert: wert.k2,
    },
    {
      ...inMathe,
      id: 't-1',
      kind: 'test',
      datum: '2026-10-14',
      notiz: 'Vektoren',
      status: 'graded',
      wert: wert.t1,
    },
    {
      ...inMathe,
      id: 'm-1',
      kind: 'muendlich',
      datum: '2026-11-02',
      status: 'graded',
      wert: wert.m1,
    },
    {
      ...inMathe,
      id: 'g-1',
      kind: 'gfs',
      datum: '2027-01-12',
      status: 'planned',
    },
    {
      ...inEnglisch,
      id: 'e-1',
      kind: 'klausur',
      datum: '2026-10-05',
      status: 'graded',
      wert: wert.e1,
    },
  ];
};

/** How the invented server behaves. Without any of these every call succeeds at once. */
type ServerBehaviour = {
  /** The address asks for the entry to be open. */
  readonly eintragen?: boolean;
  /** The first attempt to load the Leistung fails, the next one succeeds. */
  readonly loadFails?: boolean;
  /** After the first loading every further one fails, as when the connection is lost. */
  readonly refreshFails?: boolean;
  /** The first attempt to save fails, the next one succeeds. */
  readonly saveFails?: boolean;
  /** Every attempt to delete fails. */
  readonly deleteFails?: boolean;
  /** The address names a Leistung that does not exist. */
  readonly missing?: boolean;
};

const lost = () => Promise.reject(new Error('Verbindung unterbrochen'));

/** The invented server: the Leistungen of one Halbjahr, and how often it was asked. */
const createServer = (scenario: Scenario, behaviour: ServerBehaviour) => {
  const halbjahr = halbjahrOf(scenario === 'sechser' ? 'sechser' : 'punkte');
  const state = {
    leistungen: [own[scenario], ...othersOf(scenario)],
    loads: 0,
    saves: 0,
  };
  const leistungOperations: LeistungOperations = {
    load: (id) => {
      state.loads += 1;
      const failed =
        (behaviour.loadFails === true && state.loads === 1) ||
        (behaviour.refreshFails === true && state.loads > 1);
      if (failed) {
        return lost();
      }
      const leistung = state.leistungen.find((entry) => entry.id === id);
      return leistung === undefined
        ? Promise.reject(
            // The server names what went wrong with a tag, which is all the page reads.
            Object.assign(new Error('Diese Leistung gibt es nicht.'), {
              _tag: 'NoteNichtGefunden',
            }),
          )
        : Promise.resolve({ halbjahr, leistung });
    },
  };
  const notenOperations: NotenOperations = {
    create: () => Promise.resolve(),
    delete: (id) => {
      if (behaviour.deleteFails === true) {
        return lost();
      }
      state.leistungen = state.leistungen.filter((entry) => entry.id !== id);
      return Promise.resolve();
    },
    list: () => Promise.resolve(state.leistungen),
    update: ({ id, subjectId, wert, ...fields }) => {
      state.saves += 1;
      if (behaviour.saveFails === true && state.saves === 1) {
        return lost();
      }
      const fach = subjectId === 'englisch' ? inEnglisch : inMathe;
      state.leistungen = state.leistungen.map((entry): Leistung => {
        if (entry.id !== id) {
          return entry;
        }
        const base = { ...fach, ...fields, id };
        return wert === null
          ? { ...base, status: 'planned' }
          : { ...base, status: 'graded', wert };
      });
      return Promise.resolve();
    },
  };
  return { leistungOperations, notenOperations };
};

/** Stands for whatever loads the Leistung again, such as coming back to the tab. */
const RefreshStub = () => {
  const queryClient = useQueryClient();
  return (
    <button
      onClick={() =>
        queryClient.invalidateQueries({ queryKey: leistungKeyPrefix })
      }
      type="button"
    >
      Neu laden
    </button>
  );
};

/** Shows where the story is, so a test can tell what the page did to the address. */
const Address = () => {
  const { href } = useLocation();
  return <output data-testid="address">{href}</output>;
};

type Server = ReturnType<typeof createServer>;

const LeistungRoute = ({ server }: { readonly server: Server }) => {
  const { id = '' } = useParams({ strict: false });
  const { eintragen } = useSearch({ strict: false });
  const navigate = useNavigate();
  return (
    <LeistungDetail
      eintragen={eintragen === true}
      faecher={faecher}
      key={id}
      leistungId={id}
      leistungOperations={server.leistungOperations}
      notenOperations={server.notenOperations}
      onDeleted={({ fachId, halbjahrId }) =>
        navigate({
          search: { halbjahr: halbjahrId, fach: fachId },
          to: '/noten',
        })
      }
      onEntryAnswered={() =>
        navigate({
          params: { id },
          replace: true,
          search: {},
          to: '/noten/$id',
        })
      }
      today={today}
    />
  );
};

/** The page of the story with the two pages it leads to: another Leistung, and the Noten. */
const createStoryRouter = (server: Server, behaviour: ServerBehaviour) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <main className="mx-auto max-w-[72rem] px-4 pb-10">
          <p className="flex gap-4 text-ink-soft text-xs">
            <RefreshStub />
            <Address />
          </p>
          <Outlet />
        </main>
      </QueryClientProvider>
    ),
  });
  const leistungRoute = createRoute({
    component: () => <LeistungRoute server={server} />,
    getParentRoute: () => rootRoute,
    path: '/noten/$id',
    validateSearch: parseLeistungSearch,
  });
  const notenRoute = createRoute({
    component: () => <h1>Notenseite</h1>,
    getParentRoute: () => rootRoute,
    path: '/noten',
  });
  const id = behaviour.missing === true ? 'gibt-es-nicht' : 'k-1';
  return createRouter({
    history: createMemoryHistory({
      initialEntries: [
        `/noten/${id}${behaviour.eintragen === true ? '?eintragen=true' : ''}`,
      ],
    }),
    routeTree: rootRoute.addChildren([leistungRoute, notenRoute]),
  });
};

const LeistungDetailScenario = ({
  scenario,
  ...behaviour
}: ServerBehaviour & { readonly scenario: Scenario }) => {
  const [router] = useState(() =>
    createStoryRouter(createServer(scenario, behaviour), behaviour),
  );
  return <RouterProvider router={router} />;
};

/** A Klausur that is still to come. */
export const Ausstehend = (props: ServerBehaviour) => (
  <LeistungDetailScenario {...props} scenario="ausstehend" />
);

/** A Klausur with its Note, under the Fachschnitt. */
export const Benotet = (props: ServerBehaviour) => (
  <LeistungDetailScenario {...props} scenario="benotet" />
);

/** A Klausur whose date has passed without a Note. */
export const NoteFehlt = (props: ServerBehaviour) => (
  <LeistungDetailScenario {...props} scenario="fehlt" />
);

/** The only Leistung of its Fach. */
export const Allein = (props: ServerBehaviour) => (
  <LeistungDetailScenario {...props} scenario="allein" />
);

/** The only Leistung of its Fach, in a Wertungsbereich that counts 0. */
export const OhneAnteil = (props: ServerBehaviour) => (
  <LeistungDetailScenario {...props} scenario="ohneAnteil" />
);

/** A Halbjahr with Noten from 1 to 6, where less is better. */
export const Sechser = (props: ServerBehaviour) => (
  <LeistungDetailScenario {...props} scenario="sechser" />
);
