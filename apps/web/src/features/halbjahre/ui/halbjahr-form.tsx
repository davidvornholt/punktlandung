import type { RefObject } from 'react';
import { useState } from 'react';

import { formatiereIsoDatum } from '#/shared/datum/kalenderdatum.ts';
import { notensystemText } from '#/shared/noten/notensystem-text.ts';
import {
  halbjahrBezeichnung,
  istKlassenstufe,
  klassenstufen,
  klassenstufeText,
  notensystemFuerKlassenstufe,
} from '#/shared/schule/klassenstufe.ts';
import { schuljahrAuswahl } from '#/shared/schule/schuljahr.ts';
import {
  eingabeKlasse,
  labelKlasse,
  primaerKnopfKlasse,
  sekundaerKnopfKlasse,
} from '#/shared/ui/form-klassen.ts';
import type { HalbjahrEingabe } from '../schemas/halbjahr-schema.ts';
import type { Halbjahr } from '../services/halbjahr-service.ts';
import type { HalbjahrFormWerte } from './halbjahr-form-modell.ts';
import {
  belegteHalbjahre,
  halbjahrFormWerte,
  istBelegt,
  mitAktualisiertemZeitraum,
  zuHalbjahrEingabe,
} from './halbjahr-form-modell.ts';
import { HalbjahrZeitraumFeld } from './halbjahr-zeitraum-feld.tsx';

type Aendern = (teil: Partial<HalbjahrFormWerte>) => void;

const halbjahrText = (half: 1 | 2) =>
  half === 1 ? '1. Halbjahr (Aug–Jan)' : '2. Halbjahr (Feb–Jul)';

const Zusammenfassung = ({ werte }: { readonly werte: HalbjahrFormWerte }) => (
  <p className="mt-4 border border-border bg-surface-sunken px-3 py-2 text-ink-muted text-sm">
    <span className="font-semibold text-ink">{halbjahrBezeichnung(werte)}</span>{' '}
    · Schuljahr {werte.schoolYear} · {formatiereIsoDatum(werte.startsOn)} bis{' '}
    {formatiereIsoDatum(werte.endsOn)} ·{' '}
    {notensystemText(notensystemFuerKlassenstufe(werte.klassenstufe))}
  </p>
);

const Kopffelder = ({
  werte,
  belegt,
  schuljahre,
  onAendern,
}: {
  readonly werte: HalbjahrFormWerte;
  readonly belegt: ReadonlySet<string>;
  readonly schuljahre: ReadonlyArray<string>;
  readonly onAendern: Aendern;
}) => (
  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
    <label className={labelKlasse}>
      Klassenstufe
      <select
        className={eingabeKlasse}
        onChange={(ereignis) => {
          const gewaehlt = ereignis.target.value;
          if (istKlassenstufe(gewaehlt)) {
            onAendern({ klassenstufe: gewaehlt });
          }
        }}
        value={werte.klassenstufe}
      >
        {klassenstufen.map((stufe) => (
          <option key={stufe} value={stufe}>
            {klassenstufeText(stufe)}
          </option>
        ))}
      </select>
    </label>
    <label className={labelKlasse}>
      Schuljahr
      <select
        className={eingabeKlasse}
        onChange={(ereignis) =>
          onAendern({ schoolYear: ereignis.target.value })
        }
        value={werte.schoolYear}
      >
        {schuljahre.map((schuljahr) => (
          <option key={schuljahr} value={schuljahr}>
            {schuljahr}
          </option>
        ))}
      </select>
    </label>
    <label className={labelKlasse}>
      Halbjahr
      <select
        className={eingabeKlasse}
        onChange={(ereignis) =>
          onAendern({ half: ereignis.target.value === '2' ? 2 : 1 })
        }
        value={werte.half}
      >
        {([1, 2] as const).map((half) => (
          <option key={half} value={half}>
            {halbjahrText(half)}
            {istBelegt(belegt, werte.schoolYear, half)
              ? ' — schon angelegt'
              : ''}
          </option>
        ))}
      </select>
    </label>
  </div>
);

export const HalbjahrForm = ({
  titel,
  halbjahr,
  halbjahre,
  heute,
  beschaeftigt,
  fehler,
  formularRef,
  onSpeichern,
  onAbbrechen,
}: {
  readonly titel: string;
  readonly halbjahr: Halbjahr | null;
  readonly halbjahre: ReadonlyArray<Halbjahr>;
  readonly heute: string;
  readonly beschaeftigt: boolean;
  readonly fehler: string | null;
  readonly formularRef: RefObject<HTMLFormElement | null>;
  readonly onSpeichern: (werte: HalbjahrEingabe) => void;
  readonly onAbbrechen: () => void;
}) => {
  const [werte, setWerte] = useState<HalbjahrFormWerte>(() =>
    halbjahrFormWerte(halbjahr, halbjahre, heute),
  );
  const aendere: Aendern = (teil) =>
    setWerte((bisher) => mitAktualisiertemZeitraum({ ...bisher, ...teil }));

  const belegt = belegteHalbjahre(halbjahre, halbjahr);
  const schuljahre = schuljahrAuswahl(
    heute,
    halbjahre.map((eintrag) => eintrag.schoolYear),
  );
  const schonVergeben = istBelegt(belegt, werte.schoolYear, werte.half);

  return (
    <form
      className="border border-border bg-surface p-5 shadow-card"
      onSubmit={(ereignis) => {
        ereignis.preventDefault();
        onSpeichern(zuHalbjahrEingabe(werte));
      }}
      ref={formularRef}
    >
      <h3 className="font-display text-ink text-xl tracking-tight">{titel}</h3>
      <Kopffelder
        belegt={belegt}
        onAendern={aendere}
        schuljahre={schuljahre}
        werte={werte}
      />
      <Zusammenfassung werte={werte} />
      {schonVergeben ? (
        <p
          className="mt-2 border border-critical bg-critical-subtle px-3 py-2 text-ink"
          role="alert"
        >
          Für {werte.schoolYear} gibt es das {werte.half}. Halbjahr bereits.
          Wähle eine andere Kombination oder bearbeite den vorhandenen Eintrag.
        </p>
      ) : null}
      <div className="mt-4">
        <HalbjahrZeitraumFeld onAendern={aendere} werte={werte} />
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
          disabled={beschaeftigt || schonVergeben}
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
