import type { ReactNode } from 'react';
import { useId } from 'react';

/**
 * Auswahlfelder auf Basis nativer Inputs. `appearance-none` ersetzt allein die
 * Zeichnung durch Designsystem-Token — Tastaturbedienung, Gruppensemantik über
 * `name` und die Rolle für Screenreader bleiben die des Browsers. Im
 * erzwungenen Kontrastmodus fällt die Darstellung auf die Systemzeichnung
 * zurück, damit die Felder dort sichtbar bleiben.
 */

const wahlKlasse = 'flex items-center gap-2 text-ink text-sm';

const controlClass =
  'size-4 shrink-0 appearance-none border border-border-strong transition-colors duration-150 ease-standard checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary forced-colors:appearance-auto';

/** Eckig und mit Haken — sichtbar verschieden vom gefüllten Radiofeld. */
export const Checkbox = ({
  checked,
  children,
  onChange,
}: {
  readonly checked: boolean;
  readonly children: ReactNode;
  readonly onChange: (checked: boolean) => void;
}) => (
  <label className={wahlKlasse}>
    <span className="relative inline-flex">
      <input
        checked={checked}
        className={`peer ${controlClass} bg-surface`}
        onChange={(ereignis) => onChange(ereignis.currentTarget.checked)}
        type="checkbox"
      />
      <svg
        aria-hidden={true}
        className="pointer-events-none absolute inset-0 size-4 stroke-on-primary opacity-0 transition-opacity duration-150 ease-standard peer-checked:opacity-100 forced-colors:hidden"
        fill="none"
        strokeLinecap="square"
        strokeWidth={2}
        viewBox="0 0 16 16"
      >
        <path d="M4 8.5 7 11.5 12 5" />
      </svg>
    </span>
    {children}
  </label>
);

/**
 * Eckiger Rahmen mit kleiner Füllung für die exklusive Auswahl. Eine
 * `description` erklärt die Option unter ihrem Namen und ist dem Feld über
 * `aria-describedby` zugeordnet, damit der Name selbst kurz bleibt.
 */
export const Radio = ({
  checked,
  children,
  description,
  name,
  onSelect,
}: {
  readonly checked: boolean;
  readonly children: ReactNode;
  readonly description?: string;
  readonly name: string;
  readonly onSelect: () => void;
}) => {
  const descriptionId = useId();
  const described = description !== undefined;
  return (
    <label className={described ? `${wahlKlasse} items-start` : wahlKlasse}>
      <input
        aria-describedby={described ? descriptionId : undefined}
        checked={checked}
        className={`${controlClass} bg-clip-content p-1 ${described ? 'mt-0.5' : ''}`}
        name={name}
        onChange={onSelect}
        type="radio"
      />
      {described ? (
        <span className="flex flex-col gap-0.5">
          <span>{children}</span>
          <span className="text-ink-muted" id={descriptionId}>
            {description}
          </span>
        </span>
      ) : (
        children
      )}
    </label>
  );
};
