import type { ReactNode } from 'react';

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

/** Eckig und mit Haken — sichtbar verschieden vom runden Radiofeld. */
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
 * Rund, weil die Rundung die Bedeutung trägt: eine Wahl aus mehreren. Der
 * Punkt entsteht aus dem auf die Content-Box beschnittenen Hintergrund, der
 * Ring aus Rahmen und Innenabstand.
 */
export const Radio = ({
  checked,
  children,
  name,
  onSelect,
}: {
  readonly checked: boolean;
  readonly children: ReactNode;
  readonly name: string;
  readonly onSelect: () => void;
}) => (
  <label className={wahlKlasse}>
    <input
      checked={checked}
      className={`${controlClass} rounded-full bg-clip-content p-1`}
      name={name}
      onChange={onSelect}
      type="radio"
    />
    {children}
  </label>
);
