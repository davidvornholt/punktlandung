import { describe, expect, it, mock } from 'bun:test';

import { stelleFormularFokusWiederHer } from './formular-fokus.ts';

const fokusziel = (isConnected: boolean) => ({
  focus: mock(() => undefined),
  isConnected,
});

describe('stelleFormularFokusWiederHer', () => {
  it('behält den Fokus auf einem verbundenen Schuljahr-Select statt auf dem alten Formularauslöser', () => {
    const schuljahrAuswahl = fokusziel(true);
    const alterAusloeser = fokusziel(true);

    stelleFormularFokusWiederHer(schuljahrAuswahl, alterAusloeser);

    expect(schuljahrAuswahl.focus).toHaveBeenCalledTimes(1);
    expect(alterAusloeser.focus).not.toHaveBeenCalled();
  });

  it('nutzt den Ersatzauslöser, wenn das ursprüngliche Ziel entfernt wurde', () => {
    const entfernterAusloeser = fokusziel(false);
    const ersatzAusloeser = fokusziel(true);

    stelleFormularFokusWiederHer(entfernterAusloeser, ersatzAusloeser);

    expect(entfernterAusloeser.focus).not.toHaveBeenCalled();
    expect(ersatzAusloeser.focus).toHaveBeenCalledTimes(1);
  });
});
