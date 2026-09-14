import { useReducer } from 'react';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { GewichtungField } from './gewichtung-field.tsx';
import { gewichtungReducer, gewichtungStateFrom } from './gewichtung-model.ts';

/** Das Gewichtungsfeld mit eigenem Zustand, wie es das Fachformular hält. */
export const GewichtungFieldStory = ({
  system = 'punkte',
}: {
  readonly system?: Notensystem;
}) => {
  const [state, dispatch] = useReducer(
    gewichtungReducer,
    standardgewichtung,
    gewichtungStateFrom,
  );
  return (
    <main className="max-w-2xl p-4">
      <GewichtungField onAction={dispatch} state={state} system={system} />
    </main>
  );
};
