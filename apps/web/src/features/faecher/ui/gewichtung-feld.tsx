import {
  gewichtungsSaetze,
  verhaeltnisProzent,
} from '#/shared/noten/gewichtung-text.ts';
import {
  bereichTitel,
  leistungsartReihenfolge,
} from '#/shared/noten/leistungsart-text.ts';
import type {
  Leistungsart,
  Notensystem,
  Wertungsbereich,
} from '#/shared/noten/notenwert.ts';
import {
  bereichDerLeistungsart,
  wertungsbereiche,
} from '#/shared/noten/notenwert.ts';
import { labelClass } from '#/shared/ui/form-classes.ts';
import type { GewichtungAction, GewichtungState } from './gewichtung-modell.ts';
import { gewichtWirkt } from './gewichtung-modell.ts';
import type { Zeilensteuerung } from './gewichtungs-zeile.tsx';
import { GewichtungsZeile } from './gewichtungs-zeile.tsx';
import { Rechenbeispiel } from './rechenbeispiel.tsx';
import { VerhaeltnisWahl } from './verhaeltnis-wahl.tsx';

const steuerungFuer = (
  kind: Leistungsart,
  zustand: GewichtungState,
): Zeilensteuerung => {
  if (kind === 'gfs') {
    return {
      typ: 'kopplung',
      kind: 'gfs',
      text: 'Zählt wie eine Klausur',
      aktiv: zustand.gfsFolgtKlausur,
    };
  }
  if (kind === 'sonstige') {
    return {
      typ: 'kopplung',
      kind: 'sonstige',
      text: 'Zählt wie eine mündliche Note',
      aktiv: zustand.sonstigeFolgtMuendlich,
    };
  }
  if (kind === 'test') {
    return { typ: 'sammlung', gekoppelt: zustand.testsFolgenKlausur };
  }
  return { typ: 'gewicht', wirkt: gewichtWirkt(kind, zustand) };
};

const Artenliste = ({
  arten,
  zustand,
  onAktion,
}: {
  readonly arten: ReadonlyArray<Leistungsart>;
  readonly zustand: GewichtungState;
  readonly onAktion: (aktion: GewichtungAction) => void;
}) => (
  <div>
    {arten.map((kind) => (
      <GewichtungsZeile
        art={zustand.gewichtung.arten[kind]}
        key={kind}
        kind={kind}
        onAktion={onAktion}
        steuerung={steuerungFuer(kind, zustand)}
      />
    ))}
  </div>
);

const Bereichsgruppe = ({
  bereich,
  prozent,
  zustand,
  onAktion,
}: {
  readonly bereich: Wertungsbereich;
  readonly prozent: number;
  readonly zustand: GewichtungState;
  readonly onAktion: (aktion: GewichtungAction) => void;
}) => (
  <div className="mt-5">
    <p className={labelClass}>
      {bereichTitel[bereich]} · {prozent} %
    </p>
    <Artenliste
      arten={leistungsartReihenfolge.filter(
        (kind) => bereichDerLeistungsart[kind] === bereich,
      )}
      onAktion={onAktion}
      zustand={zustand}
    />
  </div>
);

/** Das Gewichtungsfeld des Fachformulars — die verkündete Regel als Eingabe. */
export const GewichtungFeld = ({
  zustand,
  system,
  onAktion,
}: {
  readonly zustand: GewichtungState;
  readonly system: Notensystem;
  readonly onAktion: (aktion: GewichtungAction) => void;
}) => {
  const { verhaeltnis } = zustand.gewichtung;
  const prozent = verhaeltnis === null ? null : verhaeltnisProzent(verhaeltnis);
  return (
    <fieldset className="mt-5 border border-border p-4">
      <legend className={`${labelClass} px-1`}>Gewichtung</legend>
      <p className="text-ink-muted text-sm">
        Trage ein, was die Lehrkraft verkündet hat — etwa „60:40
        schriftlich:mündlich“ oder „alle Tests zusammen zählen wie eine
        Klausur“.
      </p>
      <div className="mt-3">
        <VerhaeltnisWahl onAktion={onAktion} verhaeltnis={verhaeltnis} />
      </div>
      {prozent === null ? (
        <div className="mt-5">
          <Artenliste
            arten={leistungsartReihenfolge}
            onAktion={onAktion}
            zustand={zustand}
          />
        </div>
      ) : (
        wertungsbereiche.map((bereich) => (
          <Bereichsgruppe
            bereich={bereich}
            key={bereich}
            onAktion={onAktion}
            prozent={prozent[bereich]}
            zustand={zustand}
          />
        ))
      )}
      <p className="mt-4 text-ink-muted text-sm">
        {gewichtungsSaetze(zustand.gewichtung).join(' · ')}
      </p>
      <Rechenbeispiel gewichtung={zustand.gewichtung} system={system} />
    </fieldset>
  );
};
