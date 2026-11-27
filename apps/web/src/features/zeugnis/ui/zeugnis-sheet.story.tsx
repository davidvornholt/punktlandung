import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { useState } from 'react';

import type { Zeugnis } from '../services/zeugnis-service.ts';
import {
  ohneFaecher,
  ohneNoten,
  punkte,
  punkteEnden,
  sechser,
  sechserEnden,
  today,
  zwoelfAufEinerNote,
} from './zeugnis.story-fixtures.ts';
import { ZeugnisSheet } from './zeugnis-sheet.tsx';

/**
 * Das Zeugnis eines Halbjahrs mit erfundenen Daten. Die Fächer und die
 * leeren Zustände verweisen mit Router-Links weiter und brauchen einen
 * Router; ein Speicherverlauf reicht.
 */
const Sheet = ({ zeugnis }: { readonly zeugnis: Zeugnis }) => {
  const [router] = useState(() =>
    createRouter({
      history: createMemoryHistory({ initialEntries: ['/'] }),
      routeTree: createRootRoute({
        component: () => (
          <main className="p-4">
            <ZeugnisSheet today={today} zeugnis={zeugnis} />
          </main>
        ),
      }),
    }),
  );
  return <RouterProvider router={router} />;
};

export const Punkte = () => <Sheet zeugnis={punkte} />;

export const Sechser = () => <Sheet zeugnis={sechser} />;

export const OhneNoten = () => <Sheet zeugnis={ohneNoten} />;

export const OhneFaecher = () => <Sheet zeugnis={ohneFaecher} />;

export const ZwoelfAufEinerNote = () => <Sheet zeugnis={zwoelfAufEinerNote} />;

export const PunkteEnden = () => <Sheet zeugnis={punkteEnden} />;

export const SechserEnden = () => <Sheet zeugnis={sechserEnden} />;
