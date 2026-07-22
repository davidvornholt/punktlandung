import type { RefObject } from 'react';
import {
  eingabeKlasse,
  labelKlasse,
  primaerKnopfKlasse,
  sekundaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import type { HalbjahrEingabe } from '../schemas/halbjahr-schema.ts';
import { halbjahrGrenzen } from '../schemas/halbjahr-schema.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';
import { halbjahrFormWerte } from './halbjahr-form-modell.ts';

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
  fehler,
  formularRef,
  onSpeichern,
  onAbbrechen,
}: {
  readonly titel: string;
  readonly halbjahr: Halbjahr | null;
  readonly beschaeftigt: boolean;
  readonly fehler: string | null;
  readonly formularRef: RefObject<HTMLFormElement | null>;
  readonly onSpeichern: (werte: HalbjahrEingabe) => void;
  readonly onAbbrechen: () => void;
}) => {
  const werte = halbjahrFormWerte(halbjahr);
  return (
    <form
      className="border border-border bg-surface p-5 shadow-card"
      onSubmit={(ereignis) => {
        ereignis.preventDefault();
        onSpeichern(liesWerte(ereignis.currentTarget));
      }}
      ref={formularRef}
    >
      <h3 className="font-display text-ink text-xl tracking-tight">{titel}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelKlasse}>
          Bezeichnung (z. B. 10.2 oder K1.1)
          <input
            className={eingabeKlasse}
            defaultValue={werte.label}
            maxLength={halbjahrGrenzen.labelMax}
            name="label"
            required={true}
          />
        </label>
        <label className={labelKlasse}>
          Schuljahr (z. B. 2026/27)
          <input
            className={eingabeKlasse}
            defaultValue={werte.schoolYear}
            name="schoolYear"
            pattern="\d{4}/\d{2}"
            required={true}
          />
        </label>
        <label className={labelKlasse}>
          Halbjahr im Schuljahr
          <select
            className={eingabeKlasse}
            defaultValue={werte.half}
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
            defaultValue={werte.system}
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
            defaultValue={werte.startsOn}
            name="startsOn"
            required={true}
            type="date"
          />
        </label>
        <label className={labelKlasse}>
          Ende
          <input
            className={eingabeKlasse}
            defaultValue={werte.endsOn}
            name="endsOn"
            required={true}
            type="date"
          />
        </label>
      </div>
      {fehler === null ? null : (
        <p
          className="mt-4 border border-critical bg-critical-subtle px-3 py-2 text-ink"
          role="alert"
        >
          {fehler}
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <button
          className={primaerKnopfKlasse}
          disabled={beschaeftigt}
          type="submit"
        >
          {beschaeftigt ? 'Halbjahr wird gespeichert …' : 'Halbjahr speichern'}
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
};
