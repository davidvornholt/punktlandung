import { describe, expect, it } from 'bun:test';

import { NoteEntryBar } from './note-entry-bar.tsx';
import { NotenList } from './noten-list.tsx';
import { emptyNotenHint } from './noten-list-model.ts';
import type { NotenOperations } from './noten-operations.ts';
import { NotenSection } from './noten-section.tsx';

type Element = {
  readonly props?: { readonly children?: unknown };
  readonly type: unknown;
};

type FachList = ReadonlyArray<{
  readonly id: string;
  readonly name: string;
}>;

/** Kern der Aufforderung, ein Fach anzulegen. */
const anlegenAufforderung = 'ein Fach';

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
const buildingBlocks = (faecher: FachList) =>
  flatten(NotenSection({ faecher, halbjahr, operations })).map(
    (element) => element.type,
  );

/** Alle Textstücke eines Baums in Lesereihenfolge. */
const texts = (node: unknown): ReadonlyArray<string> => {
  if (Array.isArray(node)) {
    return node.flatMap(texts);
  }
  if (typeof node === 'string') {
    return [node];
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }
  return texts((node as Element).props?.children);
};

/**
 * Was ein Benutzer der Seite von oben nach unten hört. Die Notenliste steht
 * immer unter dem Abschnitt; sie hängt an einer Abfrage und lässt sich hier
 * nicht auswerten, ihr Hinweis für die leere Liste ist aber eine reine
 * Funktion der Fächerliste und steht deshalb hier an derselben Stelle wie in
 * der Anwendung.
 */
const gelesenerText = (faecher: FachList) =>
  [
    ...texts(NotenSection({ faecher, halbjahr, operations })),
    emptyNotenHint(faecher.length > 0),
  ].join(' ');

const aufforderungen = (faecher: FachList) =>
  gelesenerText(faecher).split(anlegenAufforderung).slice(1);

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

  /**
   * Der Block für „kein wählbares Fach“ fordert verlinkt dazu auf, ein Fach
   * anzulegen. Wiederholte der leere Hinweis der Liste darunter dieselbe
   * Anweisung, hörte sie am Bildschirmleser zweimal hintereinander — die
   * zweite Fassung ohne Verweis auf die Fächerseite.
   */
  it('fordert ohne wählbares Fach nur einmal dazu auf, ein Fach anzulegen', () => {
    const [erste, ...weitere] = aufforderungen([]);

    expect(erste).toBeDefined();
    expect(weitere).toEqual([]);
  });

  it('zeigt Eintragsleiste und Notenliste, sobald ein Fach wählbar ist', () => {
    const blocks = buildingBlocks([{ id: 'latein', name: 'Latein' }]);

    expect(blocks).toContain(NoteEntryBar);
    expect(blocks).toContain(NotenList);
  });
});
