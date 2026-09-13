import type { ComponentProps } from 'react';
import { createContext, useContext } from 'react';
import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Checkbox } from '#/shared/ui/checkbox.tsx';

type Node = {
  readonly position?: { readonly start?: { readonly line?: number } };
  readonly tagName?: string;
  readonly value?: unknown;
  readonly children?: ReadonlyArray<Node>;
  readonly properties?: { readonly checked?: unknown };
};

/**
 * Die Quelltextzeile, aus der remark ein Element gebaut hat. Sie ist der
 * Schlüssel zum Umschalten: `toggleTaskLine` schreibt genau diese Zeile um.
 * Das Kästchen selbst trägt keine Position — remark erzeugt es aus dem
 * Listenpunkt —, deshalb reicht der Listenpunkt seine Zeile per Kontext
 * hinunter.
 */
const sourceLine = (node: unknown): number | null => {
  const line = (node as Node | undefined)?.position?.start?.line;
  return typeof line === 'number' ? line : null;
};

const taskText = (node: Node): string => {
  if (typeof node.value === 'string') {
    return node.value;
  }
  return node.children?.map(taskText).join('') ?? '';
};

const taskLabel = (node: unknown): string => {
  const children = (node as Node | undefined)?.children ?? [];
  return children
    .filter((child) => child.tagName !== 'ul' && child.tagName !== 'ol')
    .map(taskText)
    .join('')
    .replace(/\s+/gu, ' ')
    .trim();
};

const TaskLineContext = createContext<{
  readonly line: number | null;
  readonly label: string;
} | null>(null);

/**
 * Der Umschalter kommt per Kontext statt als Argument: so bleibt die
 * Komponententabelle eine Konstante, und React baut die gerenderte Liste bei
 * jedem Haken nur um, statt sie neu aufzusetzen.
 */
const ToggleContext = createContext<(line: number) => void>(() => undefined);

/** Ob ein Listenpunkt ein abgehaktes Thema ist — sein erstes Kind ist das Kästchen. */
const isCheckedTopic = (node: unknown): boolean => {
  const first = (node as Node | undefined)?.children?.find(
    (child) => child.tagName !== undefined,
  );
  return first?.tagName === 'input' && first.properties?.checked === true;
};

type WithNode<Tag extends keyof React.JSX.IntrinsicElements> =
  ComponentProps<Tag> & { readonly node?: unknown };

const headingClass = 'mt-6 mb-2 font-display text-ink tracking-tight';

/**
 * Gerenderte Vorbereitung ohne eigenes Stylesheet: die von remark erzeugten
 * Elemente bekommen ihre Utilities hier, weil sie sonst nirgends Klassen
 * tragen könnten.
 */
const typography: Components = {
  h1: ({ node: _node, ...rest }: WithNode<'h1'>) => (
    <h2 {...rest} className={`${headingClass} text-2xl`} />
  ),
  h2: ({ node: _node, ...rest }: WithNode<'h2'>) => (
    <h3 {...rest} className={`${headingClass} text-xl`} />
  ),
  h3: ({ node: _node, ...rest }: WithNode<'h3'>) => (
    <h4 {...rest} className={`${headingClass} text-lg`} />
  ),
  p: ({ node: _node, ...rest }: WithNode<'p'>) => (
    <p {...rest} className="my-2 text-ink" />
  ),
  ul: ({ node: _node, className, ...rest }: WithNode<'ul'>) => (
    <ul
      {...rest}
      className={`my-2 ${className?.includes('contains-task-list') ? '' : 'list-disc pl-6'}`}
    />
  ),
  ol: ({ node: _node, ...rest }: WithNode<'ol'>) => (
    <ol {...rest} className="my-2 list-decimal pl-6" />
  ),
  li: ({ node, className, children, ...rest }: WithNode<'li'>) =>
    className?.includes('task-list-item') ? (
      <li
        {...rest}
        className={`mt-1 flex items-baseline gap-2 ${isCheckedTopic(node) ? 'text-ink-muted' : 'text-ink'}`}
      >
        <TaskLineContext.Provider
          value={{ line: sourceLine(node), label: taskLabel(node) }}
        >
          {children}
        </TaskLineContext.Provider>
      </li>
    ) : (
      <li {...rest} className="mt-1 text-ink">
        {children}
      </li>
    ),
  a: ({ node: _node, ...rest }: WithNode<'a'>) => (
    <a
      {...rest}
      className="underline underline-offset-4"
      rel="noreferrer"
      target="_blank"
    />
  ),
  code: ({ node: _node, ...rest }: WithNode<'code'>) => (
    <code {...rest} className="bg-surface-sunken px-1 text-[0.9em]" />
  ),
  pre: ({ node: _node, ...rest }: WithNode<'pre'>) => (
    <pre {...rest} className="my-2 overflow-x-auto bg-surface-sunken p-3" />
  ),
  blockquote: ({ node: _node, ...rest }: WithNode<'blockquote'>) => (
    <blockquote
      {...rest}
      className="my-2 border-border-strong border-l-2 pl-3 text-ink-muted"
    />
  ),
  input: ({ node: _node, checked, type, ...rest }: WithNode<'input'>) => {
    const task = useContext(TaskLineContext);
    const onToggle = useContext(ToggleContext);
    if (type !== 'checkbox' || task === null || task.line === null) {
      return <input {...rest} checked={checked} type={type} />;
    }
    const { line } = task;
    return (
      <Checkbox
        aria-label={`${checked ? 'Thema sicher' : 'Thema offen'}: ${task.label}`}
        checked={checked === true}
        className="translate-y-0.5"
        onChange={() => onToggle(line)}
      />
    );
  },
};

/**
 * Rendert die Vorbereitung. Rohes HTML rendert react-markdown nicht; die
 * Aufgabenkästchen werden bedienbar: ein Klick schaltet die Quelltextzeile
 * um, statt ein Formular zu öffnen. Überschriften rücken eine Stufe nach
 * unten, weil die Seite selbst schon h1 und h2 vergibt.
 */
export const ThemenMarkdown = ({
  markdown,
  onToggle,
}: {
  readonly markdown: string;
  /** Schaltet die Aufgabenzeile mit dieser 1-basierten Zeilennummer um. */
  readonly onToggle: (line: number) => void;
}) => (
  <ToggleContext.Provider value={onToggle}>
    <Markdown components={typography} remarkPlugins={[remarkGfm]}>
      {markdown}
    </Markdown>
  </ToggleContext.Provider>
);
