import type { FachEvaluation } from '#/shared/noten/fach-aggregation.ts';
import { evaluateFach, sammelnote } from '#/shared/noten/fach-aggregation.ts';
import { verhaeltnisProzent } from '#/shared/noten/gewichtung-text.ts';
import {
  leistungsartPlural,
  leistungsartReihenfolge,
} from '#/shared/noten/leistungsart-text.ts';
import type {
  Assessment,
  Fachgewichtung,
  Leistungsart,
  Notensystem,
} from '#/shared/noten/notenwert.ts';
import { toNotenpunkte } from '#/shared/noten/notenwert.ts';
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
const exampleNoten: Readonly<Record<Leistungsart, ReadonlyArray<number>>> = {
  klausur: [gut, befriedigend],
  test: [gut, gut, befriedigend],
  muendlich: [gut],
  gfs: [sehrGut],
  sonstige: [befriedigend],
};

const inSystem = (note: number, system: Notensystem): number =>
  system === 'punkte' ? toNotenpunkte(note, 'sechser') : note;

const roundingFactor = 100;

const formatNumber = (value: number): string =>
  `${Math.round(value * roundingFactor) / roundingFactor}`.replace('.', ',');

const assessments = (
  system: Notensystem,
  kind: Leistungsart,
): ReadonlyArray<Assessment> =>
  exampleNoten[kind].map((note) => ({
    notenwert: inSystem(note, system),
    individualGewichtung: 1,
    leistungsart: kind,
  }));

const leistungsartLine = (
  system: Notensystem,
  kind: Leistungsart,
  gewichtung: Fachgewichtung,
): string => {
  const noten = assessments(system, kind);
  const list = `${leistungsartPlural[kind]} ${noten.map((note) => formatNumber(note.notenwert)).join(', ')}`;
  const collected =
    gewichtung.arten[kind].sammlung === 'gesammelt' && noten.length > 1
      ? sammelnote(noten)
      : null;
  return collected === null ? list : `${list} → ${formatNumber(collected)}`;
};

const wertungsbereichLine = (
  gewichtung: Fachgewichtung,
  evaluation: FachEvaluation,
  system: Notensystem,
): string | null => {
  if (gewichtung.verhaeltnis === null) {
    return null;
  }
  const percent = verhaeltnisProzent(gewichtung.verhaeltnis);
  const formatPart = (value: number | null) =>
    value === null ? '—' : formatNote(value, system);
  return `Schriftlich ${formatPart(evaluation.schriftlichAverage)} (${percent.schriftlich} %) · mündlich ${formatPart(evaluation.muendlichAverage)} (${percent.muendlich} %)`;
};

/** Zeigt an erfundenen Noten, was die eingestellte Gewichtung ausrechnet. */
export const CalculationExample = ({
  gewichtung,
  system,
}: {
  readonly gewichtung: Fachgewichtung;
  readonly system: Notensystem;
}) => {
  const all = leistungsartReihenfolge.flatMap((kind) => [
    ...assessments(system, kind),
  ]);
  const evaluation = evaluateFach(all, gewichtung);
  const wertungsbereiche = wertungsbereichLine(gewichtung, evaluation, system);
  return (
    <div className="mt-4 border border-border bg-surface-sunken px-3 py-2 text-sm">
      <p className="font-semibold text-ink">Rechenbeispiel</p>
      <p className="mt-1 text-ink-muted">
        {leistungsartReihenfolge
          .map((kind) => leistungsartLine(system, kind, gewichtung))
          .join(' · ')}
      </p>
      {wertungsbereiche === null ? null : (
        <p className="mt-1 text-ink-muted">{wertungsbereiche}</p>
      )}
      <p className="mt-1 text-ink">
        Schnitt{' '}
        <span className="font-semibold">
          {evaluation.average === null
            ? '—'
            : formatNote(evaluation.average, system)}
        </span>
      </p>
    </div>
  );
};
