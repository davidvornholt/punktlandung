import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import { inlineInputClass } from '#/shared/ui/form-classes.ts';
import { Segmented } from '#/shared/ui/segmented.tsx';
import type { Halbjahr } from '../services/halbjahr-service.ts';

/** As many Halbjahre as stand side by side without scrolling on a phone. */
const mostSegments = 5;

const inOrder = (halbjahre: ReadonlyArray<Halbjahr>): ReadonlyArray<Halbjahr> =>
  [...halbjahre].sort(
    (a, b) => a.schoolYear.localeCompare(b.schoolYear) || a.half - b.half,
  );

/**
 * Chooses the Halbjahr a page shows. A few Halbjahre stand side by side, the
 * oldest at the left; a whole school career becomes a list to choose from.
 */
export const HalbjahrSelect = ({
  halbjahre,
  value,
  onChange,
}: {
  readonly halbjahre: ReadonlyArray<Halbjahr>;
  readonly value: string;
  readonly onChange: (id: string) => void;
}) => {
  const sorted = inOrder(halbjahre);
  if (sorted.length <= mostSegments) {
    return (
      <Segmented
        legend="Halbjahr"
        name="halbjahr"
        onChange={onChange}
        options={sorted.map((halbjahr) => ({
          value: halbjahr.id,
          label: formatHalbjahrLabel(halbjahr),
        }))}
        value={value}
      />
    );
  }
  return (
    <label className="block">
      <span className="sr-only">Halbjahr</span>
      <select
        className={inlineInputClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {sorted.map((halbjahr) => (
          <option key={halbjahr.id} value={halbjahr.id}>
            {formatHalbjahrLabel(halbjahr)} · {halbjahr.schoolYear}
          </option>
        ))}
      </select>
    </label>
  );
};
