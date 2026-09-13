/**
 * Aufgabenzeilen in Markdown, wie GFM sie kennt: `- [ ] Thema` offen,
 * `- [x] Thema` abgehakt. In der Vorbereitung einer Leistung sind das die
 * Themen; abgehakt heißt „kann ich". Die Regeln hier sind die eine Stelle,
 * die Fortschritt zählt und Zeilen umschaltet — die Anzeige rendert dieselben
 * Zeilen über remark-gfm, darf aber nicht selbst zählen.
 */

const taskLinePattern =
  /^(?<before>\s*(?:[-*+]|\d+[.)])\s+\[)(?<mark>[ xX])(?<after>\]\s+\S)/u;
const fencePattern = /^\s*(?:`{3,}|~{3,})/u;

export type TopicProgress = {
  readonly total: number;
  readonly checked: number;
};

type TaskLine = {
  /** 1-basierte Zeilennummer, wie remark sie in `position.start.line` meldet. */
  readonly line: number;
  readonly checked: boolean;
};

/** Alle Aufgabenzeilen außerhalb von Codeblöcken. */
const taskLines = (markdown: string): ReadonlyArray<TaskLine> => {
  const lines = markdown.split('\n');
  const found: Array<TaskLine> = [];
  let inFence = false;
  lines.forEach((text, index) => {
    if (fencePattern.test(text)) {
      inFence = !inFence;
      return;
    }
    const match = inFence ? null : taskLinePattern.exec(text);
    if (match !== null) {
      found.push({ line: index + 1, checked: match.groups?.mark !== ' ' });
    }
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
  const lines = markdown.split('\n');
  const text = lines[line - 1];
  if (
    text === undefined ||
    !taskLines(markdown).some((task) => task.line === line)
  ) {
    return markdown;
  }
  lines[line - 1] = text.replace(taskLinePattern, (...args) => {
    const groups = args.at(-1) as Record<'after' | 'before' | 'mark', string>;
    return `${groups.before}${groups.mark === ' ' ? 'x' : ' '}${groups.after}`;
  });
  return lines.join('\n');
};
