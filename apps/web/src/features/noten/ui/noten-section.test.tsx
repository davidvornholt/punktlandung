import { describe, expect, it } from 'bun:test';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import { EmptyState } from '#/shared/ui/empty-state.tsx';
import { LeistungLink } from './noten-links.tsx';
import { NotenList } from './noten-list.tsx';
import type { SelectableFach } from './noten-list-model.ts';
import type { NotenOperations } from './noten-operations.ts';
import { NotenSection } from './noten-section.tsx';

type Element = {
  readonly props?: { readonly children?: unknown; readonly to?: unknown };
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

const latein: SelectableFach = {
  id: 'latein',
  name: 'Latein',
  shortName: 'L',
  gewichtung: standardgewichtung,
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
 * Der Baum wird nur bis zu den Bausteinen ausgewertet, nicht gerendert: die
 * Zusicherung gilt der Auswahl, nicht dem Aussehen.
 */
const elements = (faecher: ReadonlyArray<SelectableFach>) =>
  flatten(
    NotenSection({
      faecher,
      halbjahr,
      link: LeistungLink,
      onSearch: () => undefined,
      operations,
      search: {},
      today: '2026-03-02',
    }),
  );

const buildingBlocks = (faecher: ReadonlyArray<SelectableFach>) =>
  elements(faecher).map((element) => element.type);

describe('NotenSection', () => {
  /**
   * Sind alle Fächer des Schuljahrs archiviert, liefert die Fächerliste nichts
   * mehr, die Noten hängen aber weiter an ihnen. Verschwände die Notenliste
   * mit der Fächerliste, wäre genau dann keine Note mehr korrigierbar.
   */
  it('zeigt die Notenliste auch ohne wählbares Fach', () => {
    const blocks = buildingBlocks([]);

    expect(blocks).toContain(NotenList);
    expect(blocks).toContain(EmptyState);
  });

  /**
   * Der Block für „kein wählbares Fach“ fordert verlinkt dazu auf, ein Fach
   * anzulegen. Stünde die Aufforderung ein zweites Mal da, hörte sie am
   * Bildschirmleser zweimal hintereinander.
   */
  it('fordert ohne wählbares Fach genau einmal dazu auf, ein Fach anzulegen', () => {
    const toFaecher = elements([]).filter(
      (element) => element.props?.to === '/faecher',
    );

    expect(toFaecher).toHaveLength(1);
    expect(toFaecher[0]?.props?.children).toBe('Fach anlegen');
    expect(
      buildingBlocks([]).filter((block) => block === EmptyState),
    ).toHaveLength(1);
  });

  it('zeigt nur die Notenliste, sobald ein Fach wählbar ist', () => {
    const blocks = buildingBlocks([latein]);

    expect(blocks).toContain(NotenList);
    expect(blocks).not.toContain(EmptyState);
  });
});
