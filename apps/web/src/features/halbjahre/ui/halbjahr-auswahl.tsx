import { halbjahrBezeichnung } from '#/shared/schule/klassenstufe.ts';
import { inputClass, labelClass } from '#/shared/ui/form-classes.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';

/** Auswahlfeld für das betrachtete Halbjahr (Noten- und Zeugnisseiten). */
export const HalbjahrAuswahl = ({
  halbjahre,
  wert,
  onWechsel,
}: {
  readonly halbjahre: ReadonlyArray<Halbjahr>;
  readonly wert: string;
  readonly onWechsel: (id: string) => void;
}) => (
  <label className={labelClass}>
    Halbjahr
    <select
      className={inputClass}
      onChange={(ereignis) => onWechsel(ereignis.target.value)}
      value={wert}
    >
      {halbjahre.map((halbjahr) => (
        <option key={halbjahr.id} value={halbjahr.id}>
          {halbjahrBezeichnung(halbjahr)} · {halbjahr.schoolYear}
        </option>
      ))}
    </select>
  </label>
);
