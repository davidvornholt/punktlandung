import { gewichtungsGrenzen } from '#/shared/noten/fach-gewichtung.ts';
import { leistungsartLabel } from '#/shared/noten/leistungsart-text.ts';
import type { Artgewichtung, Leistungsart } from '#/shared/noten/notenwert.ts';
import { inputClass } from '#/shared/ui/form-classes.ts';
import { Checkbox, Radio } from '#/shared/ui/form-controls.tsx';
import type { GewichtungAction } from './gewichtung-modell.ts';

/**
 * Was eine Leistungsart im Formular anbietet. Der Bereich fehlt bewusst: er
 * gehört zur Art, nicht zur Verkündung — ein Test ist eine schriftliche
 * Arbeit, auch wenn die Lehrkraft ihn zu den mündlichen Noten zählt.
 *
 * Nur die Vorbilder tragen `wirkt`: eine eben entkoppelte Art steht ihrem
 * Bereich per Definition unabhängig gegenüber, ihr Gewicht wirkt also immer.
 */
export type Zeilensteuerung =
  | { readonly typ: 'gewicht'; readonly wirkt: boolean }
  | {
      readonly typ: 'kopplung';
      readonly kind: 'gfs' | 'sonstige';
      readonly text: string;
      readonly aktiv: boolean;
    }
  | { readonly typ: 'sammlung'; readonly gekoppelt: boolean };

const wahlKlasse = 'flex items-center gap-2 text-ink text-sm';

const GewichtEingabe = ({
  kind,
  art,
  onAktion,
}: {
  readonly kind: Leistungsart;
  readonly art: Artgewichtung;
  readonly onAktion: (aktion: GewichtungAction) => void;
}) => (
  <label className={`${wahlKlasse} text-ink-muted`}>
    <span aria-hidden={true}>Gewicht ×</span>
    <span className="block w-20">
      <input
        aria-label={`Gewicht für ${leistungsartLabel[kind]}`}
        className={inputClass}
        inputMode="decimal"
        max={gewichtungsGrenzen.gewichtMax}
        min={gewichtungsGrenzen.gewichtSchritt}
        name={`gewicht-${kind}`}
        onChange={(ereignis) =>
          onAktion({
            typ: 'gewicht',
            kind,
            wert: Number(ereignis.currentTarget.value),
          })
        }
        step={gewichtungsGrenzen.gewichtSchritt}
        type="number"
        value={art.gewicht}
      />
    </span>
  </label>
);

/** Die Testregel als Verkündung: gesammelt wie eine Klausur oder einzeln. */
const Sammelwahl = ({
  art,
  gekoppelt,
  onAktion,
}: {
  readonly art: Artgewichtung;
  readonly gekoppelt: boolean;
  readonly onAktion: (aktion: GewichtungAction) => void;
}) => (
  <fieldset className="space-y-2">
    <legend className="sr-only">Sammlung für Test</legend>
    <Radio
      checked={gekoppelt}
      name="sammlung-test"
      onSelect={() =>
        onAktion({ typ: 'kopplung', kind: 'test', gekoppelt: true })
      }
    >
      Alle Tests zusammen zählen wie eine Klausur
    </Radio>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <Radio
        checked={!gekoppelt}
        name="sammlung-test"
        onSelect={() =>
          onAktion({ typ: 'kopplung', kind: 'test', gekoppelt: false })
        }
      >
        Jeder Test zählt einzeln
      </Radio>
      {gekoppelt ? null : (
        <GewichtEingabe art={art} kind="test" onAktion={onAktion} />
      )}
    </div>
  </fieldset>
);

const Steuerung = ({
  kind,
  art,
  steuerung,
  onAktion,
}: {
  readonly kind: Leistungsart;
  readonly art: Artgewichtung;
  readonly steuerung: Zeilensteuerung;
  readonly onAktion: (aktion: GewichtungAction) => void;
}) => {
  if (steuerung.typ === 'sammlung') {
    return (
      <Sammelwahl
        art={art}
        gekoppelt={steuerung.gekoppelt}
        onAktion={onAktion}
      />
    );
  }
  if (steuerung.typ === 'gewicht') {
    return steuerung.wirkt ? (
      <GewichtEingabe art={art} kind={kind} onAktion={onAktion} />
    ) : null;
  }
  return (
    <>
      <Checkbox
        checked={steuerung.aktiv}
        onChange={(gekoppelt) =>
          onAktion({ typ: 'kopplung', kind: steuerung.kind, gekoppelt })
        }
      >
        {steuerung.text}
      </Checkbox>
      {steuerung.aktiv ? null : (
        <GewichtEingabe art={art} kind={kind} onAktion={onAktion} />
      )}
    </>
  );
};

/** Eine Leistungsart im Gewichtungsfeld. */
export const GewichtungsZeile = ({
  kind,
  art,
  steuerung,
  onAktion,
}: {
  readonly kind: Leistungsart;
  readonly art: Artgewichtung;
  readonly steuerung: Zeilensteuerung;
  readonly onAktion: (aktion: GewichtungAction) => void;
}) => (
  <fieldset className="border-border border-t py-3 first:border-t-0">
    <legend className="sr-only">{leistungsartLabel[kind]}</legend>
    <div className="sm:grid sm:grid-cols-[7rem_1fr] sm:gap-4">
      <p aria-hidden={true} className="font-semibold text-ink text-sm">
        {leistungsartLabel[kind]}
      </p>
      <div className="mt-2 space-y-2 sm:mt-0">
        <Steuerung
          art={art}
          kind={kind}
          onAktion={onAktion}
          steuerung={steuerung}
        />
      </div>
    </div>
  </fieldset>
);
