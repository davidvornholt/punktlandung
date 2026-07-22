import {
  eingabeKlasse,
  labelKlasse,
  primaerKnopfKlasse,
  sekundaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import type { HalbjahrEingabe } from '../schemas/halbjahr-schema.ts';
import { halbjahrGrenzen } from '../schemas/halbjahr-schema.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';

const liesWerte = (form: HTMLFormElement): HalbjahrEingabe => {
  const daten = new FormData(form);
  const text = (name: string) => `${daten.get(name) ?? ''}`.trim();
  return {
    label: text('label'),
    schoolYear: text('schoolYear'),
    half: text('half') === '2' ? 2 : 1,
    system: text('system') === 'punkte' ? 'punkte' : 'sechser',
    startsOn: text('startsOn'),
    endsOn: text('endsOn'),
  };
};

export const HalbjahrForm = ({
  titel,
  halbjahr,
  beschaeftigt,
  onSpeichern,
  onAbbrechen,
}: {
  readonly titel: string;
  readonly halbjahr: Halbjahr | null;
  readonly beschaeftigt: boolean;
  readonly onSpeichern: (werte: HalbjahrEingabe) => void;
  readonly onAbbrechen: () => void;
}) => (
  <form
    className="border border-border bg-surface p-5 shadow-card"
    onSubmit={(ereignis) => {
      ereignis.preventDefault();
      onSpeichern(liesWerte(ereignis.currentTarget));
    }}
  >
    <h3 className="font-display text-ink text-xl tracking-tight">{titel}</h3>
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className={labelKlasse}>
        Bezeichnung (z. B. 10.2 oder K1.1)
        <input
          className={eingabeKlasse}
          defaultValue={halbjahr?.label ?? ''}
          maxLength={halbjahrGrenzen.labelMax}
          name="label"
          required={true}
        />
      </label>
      <label className={labelKlasse}>
        Schuljahr (z. B. 2026/27)
        <input
          className={eingabeKlasse}
          defaultValue={halbjahr?.schoolYear ?? ''}
          name="schoolYear"
          pattern="\d{4}/\d{2}"
          required={true}
        />
      </label>
      <label className={labelKlasse}>
        Halbjahr im Schuljahr
        <select
          className={eingabeKlasse}
          defaultValue={halbjahr?.half ?? 1}
          name="half"
        >
          <option value={1}>1. Halbjahr</option>
          <option value={2}>2. Halbjahr</option>
        </select>
      </label>
      <label className={labelKlasse}>
        Notensystem
        <select
          className={eingabeKlasse}
          defaultValue={halbjahr?.system ?? 'sechser'}
          name="system"
        >
          <option value="sechser">Noten 1–6</option>
          <option value="punkte">Notenpunkte 0–15</option>
        </select>
      </label>
      <label className={labelKlasse}>
        Beginn
        <input
          className={eingabeKlasse}
          defaultValue={halbjahr?.startsOn ?? ''}
          name="startsOn"
          required={true}
          type="date"
        />
      </label>
      <label className={labelKlasse}>
        Ende
        <input
          className={eingabeKlasse}
          defaultValue={halbjahr?.endsOn ?? ''}
          name="endsOn"
          required={true}
          type="date"
        />
      </label>
    </div>
    <div className="mt-5 flex gap-3">
      <button
        className={primaerKnopfKlasse}
        disabled={beschaeftigt}
        type="submit"
      >
        Halbjahr speichern
      </button>
      <button
        className={sekundaerKnopfKlasse}
        onClick={onAbbrechen}
        type="button"
      >
        Abbrechen
      </button>
    </div>
  </form>
);
