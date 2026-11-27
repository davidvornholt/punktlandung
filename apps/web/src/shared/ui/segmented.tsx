import type { ReactNode } from 'react';

export type SegmentedOption<Value extends string> = {
  readonly value: Value;
  readonly label: ReactNode;
};

const segmentClass =
  'grid min-h-[2.375rem] flex-1 place-items-center px-3 text-ui whitespace-nowrap transition-colors duration-100 ease-standard peer-checked:bg-ink peer-checked:font-bold peer-checked:text-paper peer-[&:not(:checked):hover]:bg-paper';

/**
 * One choice out of a few that are all worth seeing at once. The drawn
 * segments lie over native radio buttons, so arrow keys, the group and the
 * screen-reader role are the browser's. When the segments do not fit, the
 * control scrolls sideways instead of wrapping.
 */
export const Segmented = <Value extends string>({
  className,
  form,
  legend,
  name,
  onChange,
  options,
  showLegend = false,
  value,
}: {
  readonly className?: string;
  /** Id of the form the choice belongs to when it is drawn outside of it. */
  readonly form?: string;
  readonly legend: string;
  readonly name: string;
  readonly onChange: (value: Value) => void;
  readonly options: ReadonlyArray<SegmentedOption<Value>>;
  /** Shows the legend as the field's label instead of keeping it for screen readers. */
  readonly showLegend?: boolean;
  readonly value: Value | null;
}) => (
  <fieldset className={`min-w-0 ${className ?? ''}`}>
    <legend className={showLegend ? 'mb-1.5 text-ink-soft text-sm' : 'sr-only'}>
      {legend}
    </legend>
    {/* The keyboard focus is drawn around the whole control: a ring around one segment would be cut off by the box that scrolls them, and the arrow keys move the choice along with the focus anyway. */}
    <div className="flex max-w-full overflow-x-auto border-[1.5px] border-ink bg-sheet has-focus-visible:outline-[2.5px] has-focus-visible:outline-focus has-focus-visible:outline-offset-2">
      {options.map((option, index) => (
        <label className="relative flex flex-auto" key={option.value}>
          <input
            checked={option.value === value}
            className="peer absolute inset-0 size-full cursor-pointer opacity-0"
            form={form}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          <span
            className={`${segmentClass} ${index === 0 ? '' : 'border-line border-l'}`}
          >
            {option.label}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);
