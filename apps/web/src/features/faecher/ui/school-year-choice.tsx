import { useRef } from 'react';

import { inputClass, labelClass } from '#/shared/ui/form-classes.ts';
import { Segmented } from '#/shared/ui/segmented.tsx';

/**
 * Up to this many Schuljahre are all shown at once; more become a list to
 * open. Three segments are what fits beside each other on a phone.
 */
const limits = { segments: 3 } as const;

/**
 * Chooses the Schuljahr whose Fächer the page shows, oldest first, as the
 * Halbjahr is chosen on the other pages. The control keeps the keyboard
 * focus after a choice: the page under it is replaced, and a form that was
 * open there must not take the focus along when it closes.
 */
export const SchoolYearChoice = ({
  onChange,
  schoolYears,
  value,
}: {
  readonly onChange: (schoolYear: string) => void;
  readonly schoolYears: ReadonlyArray<string>;
  readonly value: string;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const sorted = [...schoolYears].sort();
  const choose = (schoolYear: string) => {
    // A browser that does not focus a radio button on a click would leave
    // the focus in the form that is about to close.
    hostRef.current
      ?.querySelector<HTMLElement>('input:checked, select')
      ?.focus({ preventScroll: true });
    onChange(schoolYear);
  };
  return (
    <div ref={hostRef}>
      {sorted.length > limits.segments ? (
        <label className={labelClass}>
          Schuljahr
          <select
            className={inputClass}
            onChange={(event) => choose(event.currentTarget.value)}
            value={value}
          >
            {sorted.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <Segmented
          legend="Schuljahr"
          name="schuljahr"
          onChange={choose}
          options={sorted.map((year) => ({ value: year, label: year }))}
          value={value}
        />
      )}
    </div>
  );
};
