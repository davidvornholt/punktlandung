import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import { inputClass, labelClass } from '#/shared/ui/form-classes.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';

/** Auswahlfeld für das betrachtete Halbjahr (Noten- und Zeugnisseiten). */
export const HalbjahrSelect = ({
  halbjahre,
  value,
  onChange,
}: {
  readonly halbjahre: ReadonlyArray<Halbjahr>;
  readonly value: string;
  readonly onChange: (id: string) => void;
}) => (
  <label className={labelClass}>
    Halbjahr
    <select
      className={inputClass}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {halbjahre.map((halbjahr) => (
        <option key={halbjahr.id} value={halbjahr.id}>
          {formatHalbjahrLabel(halbjahr)} · {halbjahr.schoolYear}
        </option>
      ))}
    </select>
  </label>
);
