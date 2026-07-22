import {
  eingabeKlasse,
  labelKlasse,
  primaerKnopfKlasse,
  sekundaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import type { FachEingabe } from '../schemas/fach-schema.ts';
import { fachGrenzen } from '../schemas/fach-schema.ts';
import type { Fach } from '../services/fach-service.ts';

const gewichtsFelder = [
  { name: 'klausurWeight', label: 'Klausur' },
  { name: 'testWeight', label: 'Test' },
  { name: 'muendlichWeight', label: 'Mündlich' },
  { name: 'gfsWeight', label: 'GFS' },
  { name: 'sonstigeWeight', label: 'Sonstige' },
] as const;

const liesWerte = (form: HTMLFormElement): FachEingabe => {
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
  onSpeichern,
  onAbbrechen,
}: {
  readonly titel: string;
  readonly fach: Fach | null;
  readonly beschaeftigt: boolean;
  readonly onSpeichern: (werte: FachEingabe) => void;
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
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
      <label className={labelKlasse}>
        Name
        <input
          className={eingabeKlasse}
          defaultValue={fach?.name ?? ''}
          maxLength={fachGrenzen.nameMax}
          name="name"
          required={true}
        />
      </label>
      <label className={labelKlasse}>
        Kürzel
        <input
          className={eingabeKlasse}
          defaultValue={fach?.shortName ?? ''}
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
              defaultValue={fach?.[feld.name] ?? 1}
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
          defaultValue={fach?.writtenShare ?? ''}
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
    <div className="mt-5 flex gap-3">
      <button
        className={primaerKnopfKlasse}
        disabled={beschaeftigt}
        type="submit"
      >
        Fach speichern
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
