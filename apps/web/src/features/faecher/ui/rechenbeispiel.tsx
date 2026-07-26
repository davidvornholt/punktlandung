import { verhaeltnisProzent } from '#/shared/noten/gewichtung-text.ts';
import {
  leistungsartPlural,
  leistungsartReihenfolge,
} from '#/shared/noten/leistungsart-text.ts';
import type {
  Fachauswertung,
  Fachgewichtung,
  Leistung,
  Leistungsart,
  Notensystem,
} from '#/shared/noten/notenwert.ts';
import {
  fachauswertung,
  sammelnote,
  zuPunkten,
} from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';

const sehrGut = 1;
const gut = 2;
const befriedigend = 3;

/**
 * Erfundene Noten, an denen die eingestellte Gewichtung sofort sichtbar wird:
 * mehrere Tests gegen wenige Klausuren, damit die Sammelregel etwas ändert.
 * Notiert in der Sechserskala; für die Kursstufe rechnet die amtliche Formel
 * sie um, damit beide Varianten dieselbe Leistung zeigen.
 */
const beispielnoten: Readonly<Record<Leistungsart, ReadonlyArray<number>>> = {
  klausur: [gut, befriedigend],
  test: [gut, gut, befriedigend],
  muendlich: [gut],
  gfs: [sehrGut],
  sonstige: [befriedigend],
};

const imSystem = (note: number, system: Notensystem): number =>
  system === 'punkte' ? zuPunkten(note, 'sechser') : note;

const rundungsFaktor = 100;

const zahl = (wert: number): string =>
  `${Math.round(wert * rundungsFaktor) / rundungsFaktor}`.replace('.', ',');

const leistungen = (
  system: Notensystem,
  kind: Leistungsart,
): ReadonlyArray<Leistung> =>
  beispielnoten[kind].map((note) => ({
    value: imSystem(note, system),
    weight: 1,
    kind,
  }));

const artZeile = (
  system: Notensystem,
  kind: Leistungsart,
  gewichtung: Fachgewichtung,
): string => {
  const noten = leistungen(system, kind);
  const liste = `${leistungsartPlural[kind]} ${noten.map((note) => zahl(note.value)).join(', ')}`;
  const gesammelt =
    gewichtung.arten[kind].sammlung === 'gesammelt' && noten.length > 1
      ? sammelnote(noten)
      : null;
  return gesammelt === null ? liste : `${liste} → ${zahl(gesammelt)}`;
};

const bereichszeile = (
  gewichtung: Fachgewichtung,
  auswertung: Fachauswertung,
  system: Notensystem,
): string | null => {
  if (gewichtung.verhaeltnis === null) {
    return null;
  }
  const prozent = verhaeltnisProzent(gewichtung.verhaeltnis);
  const teil = (wert: number | null) =>
    wert === null ? '—' : formatNote(wert, system);
  return `Schriftlich ${teil(auswertung.schriftlich)} (${prozent.schriftlich} %) · mündlich ${teil(auswertung.muendlich)} (${prozent.muendlich} %)`;
};

/** Zeigt an erfundenen Noten, was die eingestellte Gewichtung ausrechnet. */
export const Rechenbeispiel = ({
  gewichtung,
  system,
}: {
  readonly gewichtung: Fachgewichtung;
  readonly system: Notensystem;
}) => {
  const alle = leistungsartReihenfolge.flatMap((kind) => [
    ...leistungen(system, kind),
  ]);
  const auswertung = fachauswertung(alle, gewichtung);
  const bereiche = bereichszeile(gewichtung, auswertung, system);
  return (
    <div className="mt-4 border border-border bg-surface-sunken px-3 py-2 text-sm">
      <p className="font-semibold text-ink">Rechenbeispiel</p>
      <p className="mt-1 text-ink-muted">
        {leistungsartReihenfolge
          .map((kind) => artZeile(system, kind, gewichtung))
          .join(' · ')}
      </p>
      {bereiche === null ? null : (
        <p className="mt-1 text-ink-muted">{bereiche}</p>
      )}
      <p className="mt-1 text-ink">
        Schnitt{' '}
        <span className="font-semibold">
          {auswertung.schnitt === null
            ? '—'
            : formatNote(auswertung.schnitt, system)}
        </span>
      </p>
    </div>
  );
};
