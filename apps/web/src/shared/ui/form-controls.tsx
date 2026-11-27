import type { ReactNode } from 'react';
import { useId } from 'react';

/**
 * Choice fields on native inputs. `appearance-none` replaces only the drawing
 * with design tokens: keyboard use, grouping by `name` and the role for screen
 * readers stay the browser's. In forced-colours mode the drawing falls back to
 * the system's, so the fields stay visible there.
 */

/* A line of text is a pixel lower than the 24px a pointer target needs at least. */
const choiceClass = 'flex min-h-6 items-center gap-2.5 text-ink';

const controlClass =
  'size-[1.125rem] shrink-0 cursor-pointer appearance-none border-[1.5px] border-ink bg-paper transition-colors duration-150 ease-standard forced-colors:appearance-auto';

/** A square with a tick: visibly different from the round radio button. */
export const Checkbox = ({
  checked,
  children,
  onChange,
}: {
  readonly checked: boolean;
  readonly children: ReactNode;
  readonly onChange: (checked: boolean) => void;
}) => (
  <label className={choiceClass}>
    <span className="relative inline-flex">
      <input
        checked={checked}
        className={`peer ${controlClass} checked:bg-ink`}
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <svg
        aria-hidden={true}
        className="pointer-events-none absolute inset-0 size-[1.125rem] stroke-paper opacity-0 transition-opacity duration-150 ease-standard peer-checked:opacity-100 forced-colors:hidden"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.25}
        viewBox="0 0 18 18"
      >
        <path d="M4.5 9.5 7.75 12.5 13.5 5.5" />
      </svg>
    </span>
    {children}
  </label>
);

/**
 * A ring that fills with a disc, for the exclusive choice. A `description`
 * explains the option under its name and belongs to the field through
 * `aria-describedby`, so the name itself stays short.
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
    <label className={described ? `${choiceClass} items-start` : choiceClass}>
      <input
        aria-describedby={described ? descriptionId : undefined}
        checked={checked}
        className={`${controlClass} rounded-full bg-clip-content p-[3px] checked:bg-ink ${described ? 'mt-0.5' : ''}`}
        name={name}
        onChange={onSelect}
        type="radio"
      />
      {described ? (
        <span className="flex flex-col gap-0.5">
          <span>{children}</span>
          <span className="text-ink-soft text-sm" id={descriptionId}>
            {description}
          </span>
        </span>
      ) : (
        children
      )}
    </label>
  );
};
