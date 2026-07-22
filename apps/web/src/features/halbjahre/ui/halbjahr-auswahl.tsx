import { eingabeKlasse, labelKlasse } from '#/shared/ui/form-klassen.ts';
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
  <label className={labelKlasse}>
    Halbjahr
    <select
      className={eingabeKlasse}
      onChange={(ereignis) => onWechsel(ereignis.target.value)}
      value={wert}
    >
      {halbjahre.map((halbjahr) => (
        <option key={halbjahr.id} value={halbjahr.id}>
          {halbjahr.label} · {halbjahr.schoolYear}
        </option>
      ))}
    </select>
  </label>
);
