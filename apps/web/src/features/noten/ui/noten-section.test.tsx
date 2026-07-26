import { describe, expect, it } from 'bun:test';

import { NoteEntryBar } from './note-entry-bar.tsx';
import { NotenList } from './noten-list.tsx';
import type { NotenOperations } from './noten-operations.ts';
import { NotenSection } from './noten-section.tsx';

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

const operations: NotenOperations = {
  create: () => Promise.resolve(),
  delete: () => Promise.resolve(),
  list: () => Promise.resolve([]),
  update: () => Promise.resolve(),
};

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
  flatten(NotenSection({ faecher, halbjahr, operations })).map(
    (element) => element.type,
  );

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
