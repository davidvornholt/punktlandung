import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Aufgabenzeilen in Markdown, wie GFM sie kennt: `- [ ] Thema` offen,
 * `- [x] Thema` abgehakt. In der Vorbereitung einer Leistung sind das die
 * Themen; abgehakt heißt „kann ich". Die Regeln hier sind die eine Stelle,
 * die Fortschritt zählt und Zeilen umschaltet — die Anzeige rendert dieselben
 * Zeilen über remark-gfm, darf aber nicht selbst zählen.
 */

type MarkdownNode = {
  readonly type?: string;
  readonly checked?: boolean | null;
  readonly value?: string;
  readonly children?: ReadonlyArray<MarkdownNode>;
  readonly position?: {
    readonly start?: {
      readonly line?: number;
      readonly offset?: number;
    };
  };
};

const taskMarkerPattern = /\[[ xX]\]/u;

export type TopicProgress = {
  readonly total: number;
  readonly checked: number;
};

type TaskLine = {
  /** 1-basierte Zeilennummer, wie remark sie in `position.start.line` meldet. */
  readonly line: number;
  readonly checked: boolean;
  /** UTF-16-Offset des `[ ]`-Markers im ursprünglichen Markdown. */
  readonly markerOffset: number;
};

const taskMarkerOffset = (
  markdown: string,
  node: MarkdownNode,
): number | null => {
  const offset = node.position?.start?.offset;
  if (typeof offset !== 'number') {
    return null;
  }
  const lineEnd = markdown.indexOf('\n', offset);
  const line = markdown.slice(offset, lineEnd === -1 ? undefined : lineEnd);
  const marker = taskMarkerPattern.exec(line);
  return marker === null || marker.index === undefined
    ? null
    : offset + marker.index;
};

/** Alle Aufgabenzeilen aus demselben GFM-AST wie bei der Darstellung. */
const taskLines = (markdown: string): ReadonlyArray<TaskLine> => {
  const found: Array<TaskLine> = [];
  const collectTasks =
    () =>
    (tree: MarkdownNode): void => {
      const visit = (node: MarkdownNode): void => {
        if (node.type === 'listItem' && typeof node.checked === 'boolean') {
          const line = node.position?.start?.line;
          const markerOffset = taskMarkerOffset(markdown, node);
          if (typeof line === 'number' && markerOffset !== null) {
            found.push({
              line,
              checked: node.checked,
              markerOffset,
            });
          }
        }
        node.children?.forEach(visit);
      };
      visit(tree);
    };

  // Markdown is synchronous; the remark plugin sees mdast before rendering,
  // so no browser DOM or second Markdown parser is needed.
  Markdown({
    children: markdown,
    remarkPlugins: [remarkGfm, collectTasks],
  });
  return found;
};

/** Wie viele Themen es gibt und wie viele davon sicher sind. */
export const topicProgress = (markdown: string): TopicProgress => {
  const tasks = taskLines(markdown);
  return {
    total: tasks.length,
    checked: tasks.filter((task) => task.checked).length,
  };
};

/**
 * Schaltet die Aufgabenzeile mit dieser 1-basierten Zeilennummer um und gibt
 * den neuen Quelltext zurück. Ist die Zeile keine Aufgabenzeile — weil der
 * Text inzwischen ein anderer ist —, bleibt alles unverändert.
 */
export const toggleTaskLine = (markdown: string, line: number): string => {
  const task = taskLines(markdown).find((entry) => entry.line === line);
  if (task === undefined) {
    return markdown;
  }
  const marker = task.checked ? ' ' : 'x';
  return `${markdown.slice(0, task.markerOffset + 1)}${marker}${markdown.slice(task.markerOffset + 2)}`;
};
