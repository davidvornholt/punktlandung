import type { RefObject } from 'react';
import { useReducer } from 'react';

import type { Fachgewichtung, Notensystem } from '#/shared/noten/notenwert.ts';
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '#/shared/ui/form-classes.ts';
import type { FachFelder } from '../schemas/fach-schema.ts';
import { fachGrenzen } from '../schemas/fach-schema.ts';
import type { Fach } from '../services/fach-service.ts';
import { fachFormWerte } from './fach-form-modell.ts';
import { GewichtungFeld } from './gewichtung-feld.tsx';
import {
  gewichtungReducer,
  gewichtungStateFrom,
  verhaeltnisGueltig,
} from './gewichtung-modell.ts';

const liesWerte = (
  form: HTMLFormElement,
  gewichtung: Fachgewichtung,
): FachFelder => {
  const daten = new FormData(form);
  const text = (name: string) => `${daten.get(name) ?? ''}`.trim();
  return {
    name: text('name'),
    shortName: text('shortName'),
    gewichtung,
  };
};

export const FachForm = ({
  titel,
  fach,
  system,
  beschaeftigt,
  fehler,
  formRef,
  onSpeichern,
  onAbbrechen,
}: {
  readonly titel: string;
  readonly fach: Fach | null;
  readonly system: Notensystem;
  readonly beschaeftigt: boolean;
  readonly fehler: string | null;
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly onSpeichern: (werte: FachFelder) => void;
  readonly onAbbrechen: () => void;
}) => {
  const werte = fachFormWerte(fach);
  const [zustand, aktion] = useReducer(
    gewichtungReducer,
    werte.gewichtung,
    gewichtungStateFrom,
  );
  const gueltig = verhaeltnisGueltig(zustand.gewichtung);
  return (
    <form
      className="border border-border bg-surface p-5 shadow-card"
      onSubmit={(ereignis) => {
        ereignis.preventDefault();
        if (gueltig) {
          onSpeichern(liesWerte(ereignis.currentTarget, zustand.gewichtung));
        }
      }}
      ref={formRef}
    >
      <h3 className="font-display text-ink text-xl tracking-tight">{titel}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <label className={labelClass}>
          Name
          <input
            className={inputClass}
            defaultValue={werte.name}
            maxLength={fachGrenzen.nameMax}
            name="name"
            required={true}
          />
        </label>
        <label className={labelClass}>
          Kürzel
          <input
            className={inputClass}
            defaultValue={werte.shortName}
            maxLength={fachGrenzen.kuerzelMax}
            name="shortName"
            required={true}
          />
        </label>
      </div>
      <GewichtungFeld onAktion={aktion} system={system} zustand={zustand} />
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
          className={primaryButtonClass}
          disabled={beschaeftigt || !gueltig}
          type="submit"
        >
          {beschaeftigt ? 'Fach wird gespeichert …' : 'Fach speichern'}
        </button>
        <button
          className={secondaryButtonClass}
          onClick={onAbbrechen}
          type="button"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
};
