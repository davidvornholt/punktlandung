import type { RefObject } from 'react';
import {
  eingabeKlasse,
  labelKlasse,
  primaerKnopfKlasse,
  sekundaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import type { FachFelder } from '../schemas/fach-schema.ts';
import { fachGrenzen } from '../schemas/fach-schema.ts';
import type { Fach } from '../services/fach-service.ts';
import { fachFormWerte } from './fach-form-modell.ts';

const gewichtsFelder = [
  { name: 'klausurWeight', label: 'Klausur' },
  { name: 'testWeight', label: 'Test' },
  { name: 'muendlichWeight', label: 'Mündlich' },
  { name: 'gfsWeight', label: 'GFS' },
  { name: 'sonstigeWeight', label: 'Sonstige' },
] as const;

const liesWerte = (form: HTMLFormElement): FachFelder => {
  const daten = new FormData(form);
  const text = (name: string) => `${daten.get(name) ?? ''}`.trim();
  const gewicht = (name: string) => {
    const roh = text(name).replace(',', '.');
    return roh === '' ? 1 : Number(roh);
  };
  const anteil = text('writtenShare');
  return {
    name: text('name'),
    shortName: text('shortName'),
    writtenShare: anteil === '' ? null : Number(anteil),
    klausurWeight: gewicht('klausurWeight'),
    testWeight: gewicht('testWeight'),
    muendlichWeight: gewicht('muendlichWeight'),
    gfsWeight: gewicht('gfsWeight'),
    sonstigeWeight: gewicht('sonstigeWeight'),
  };
};

export const FachForm = ({
  titel,
  fach,
  beschaeftigt,
  fehler,
  formularRef,
  onSpeichern,
  onAbbrechen,
}: {
  readonly titel: string;
  readonly fach: Fach | null;
  readonly beschaeftigt: boolean;
  readonly fehler: string | null;
  readonly formularRef: RefObject<HTMLFormElement | null>;
  readonly onSpeichern: (werte: FachFelder) => void;
  readonly onAbbrechen: () => void;
}) => {
  const werte = fachFormWerte(fach);
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
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <label className={labelKlasse}>
          Name
          <input
            className={eingabeKlasse}
            defaultValue={werte.name}
            maxLength={fachGrenzen.nameMax}
            name="name"
            required={true}
          />
        </label>
        <label className={labelKlasse}>
          Kürzel
          <input
            className={eingabeKlasse}
            defaultValue={werte.shortName}
            maxLength={fachGrenzen.kuerzelMax}
            name="shortName"
            required={true}
          />
        </label>
      </div>
      <fieldset className="mt-5 border border-border p-4">
        <legend className={`${labelKlasse} px-1`}>
          Gewichtung je Leistungsart
        </legend>
        <p className="text-ink-muted text-sm">
          Gewichtung wie von der Lehrkraft verkündet, z. B. Klausuren doppelt:
          Klausur 2, alles andere 1.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {gewichtsFelder.map((feld) => (
            <label className={labelKlasse} key={feld.name}>
              {feld.label}
              <input
                className={eingabeKlasse}
                defaultValue={werte[feld.name]}
                inputMode="decimal"
                max={fachGrenzen.gewichtMax}
                min={fachGrenzen.gewichtSchritt}
                name={feld.name}
                step={fachGrenzen.gewichtSchritt}
                type="number"
              />
            </label>
          ))}
        </div>
        <label className={`${labelKlasse} mt-4`}>
          Schriftlicher Anteil in Prozent (optional)
          <input
            className={eingabeKlasse}
            defaultValue={werte.writtenShare}
            inputMode="numeric"
            max={fachGrenzen.anteilMax}
            min={0}
            name="writtenShare"
            step={1}
            type="number"
          />
        </label>
        <p className="mt-2 text-ink-faint text-sm">
          Leer lassen, wenn die Lehrkraft keine schriftlich/mündlich-Aufteilung
          verkündet hat — dann zählt eine gemeinsame gewichtete Liste.
        </p>
      </fieldset>
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
          {beschaeftigt ? 'Fach wird gespeichert …' : 'Fach speichern'}
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
