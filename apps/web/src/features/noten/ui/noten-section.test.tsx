import { describe, expect, it, mock } from 'bun:test';

type Element = {
  readonly props?: { readonly children?: unknown };
  readonly type: unknown;
};

const halbjahr = {
  endsOn: '2026-07-31',
  id: 'hj-1',
  startsOn: '2026-02-01',
  system: 'sechser',
} as const;

/**
 * Die Serverfunktionsmodule lesen beim Laden die Umgebung und lassen sich in
 * einem Test nicht echt einbinden. Sie sind das Einzige, was hier ersetzt wird:
 * Bun hält Modulattrappen prozessweit, also nähme eine Attrappe eines geteilten
 * Moduls — React, der Abfragespeicher, ein Datumshelfer — jeder später
 * laufenden Testdatei das echte Modul weg. Keine andere Testdatei bindet die
 * Serverfunktionen ein, also endet diese Attrappe hier folgenlos.
 */
mock.module('../server/noten-fns.ts', () => ({
  createNoteFn: () => Promise.resolve(),
  deleteNoteFn: () => Promise.resolve(),
  notenQueryOptions: (halbjahrId: string) => ({
    queryKey: ['noten', halbjahrId],
  }),
  updateNoteFn: () => Promise.resolve(),
}));

const { NoteEntryBar } = await import('./note-entry-bar.tsx');
const { NotenList } = await import('./noten-list.tsx');
const { NotenSection } = await import('./noten-section.tsx');

const flatten = (node: unknown): ReadonlyArray<Element> => {
  if (Array.isArray(node)) {
    return node.flatMap(flatten);
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }
  const element = node as Element;
  return [element, ...flatten(element.props?.children)];
};

/**
 * Der Notenteil kommt ohne Zustand aus, lässt sich also als Funktion aufrufen.
 * Der Baum wird nur bis zu den Bausteinen ausgewertet, nicht gerendert — die
 * Zusicherung gilt der Auswahl, nicht dem Aussehen.
 */
const buildingBlocks = (
  faecher: ReadonlyArray<{ readonly id: string; readonly name: string }>,
) =>
  flatten(NotenSection({ faecher, halbjahr })).map((element) => element.type);

describe('NotenSection', () => {
  /**
   * Sind alle Fächer des Schuljahrs archiviert, liefert die Fächerliste nichts
   * mehr — die Noten hängen aber weiter an ihnen. Verschwände die Notenliste
   * mit der Fächerliste, wäre genau dann keine Note mehr korrigierbar.
   */
  it('zeigt die Notenliste auch ohne wählbares Fach', () => {
    const blocks = buildingBlocks([]);

    expect(blocks).toContain(NotenList);
    expect(blocks).not.toContain(NoteEntryBar);
  });

  it('zeigt Eintragsleiste und Notenliste, sobald ein Fach wählbar ist', () => {
    const blocks = buildingBlocks([{ id: 'latein', name: 'Latein' }]);

    expect(blocks).toContain(NoteEntryBar);
    expect(blocks).toContain(NotenList);
  });
});
