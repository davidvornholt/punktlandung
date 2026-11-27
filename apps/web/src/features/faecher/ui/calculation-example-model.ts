import { nbsp } from '#/shared/date/date-text.ts';
import { anteilText } from '#/shared/noten/anteil-text.ts';
import {
  evaluateFach,
  leistungsanteile,
  sammelnote,
} from '#/shared/noten/fach-aggregation.ts';
import { verhaeltnisProzent } from '#/shared/noten/gewichtung-text.ts';
import {
  leistungsartLabel,
  leistungsartReihenfolge,
} from '#/shared/noten/leistungsart-text.ts';
import type {
  Assessment,
  Fachgewichtung,
  Leistungsart,
  Notensystem,
} from '#/shared/noten/notenwert.ts';
import {
  bereichDerLeistungsart,
  toNotenpunkte,
} from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { RulerModel } from '#/shared/ui/ruler/geometry.ts';

/**
 * Made-up Noten that show at once what a Gewichtung does. There are several
 * Tests beside few Klausuren, so collecting the Tests changes something, and
 * the mündliche Noten are better than the schriftliche, so the Verhältnis
 * moves the Schnitt. Every Note lies on its own step of the scale, so each
 * disc can be seen. They are written in the Sechserskala on the Notentendenzen
 * that have an official counterpart in Notenpunkte, so both scales show the
 * same Leistung.
 */
const exampleNoten = [
  { kind: 'klausur', note: 3.25 },
  { kind: 'klausur', note: 2.75 },
  { kind: 'gfs', note: 1.75 },
  { kind: 'test', note: 3 },
  { kind: 'test', note: 2.25 },
  { kind: 'test', note: 2 },
  { kind: 'muendlich', note: 1.25 },
  { kind: 'sonstige', note: 1 },
] as const satisfies ReadonlyArray<{
  readonly kind: Leistungsart;
  readonly note: number;
}>;

type ExampleNote = Assessment & { readonly id: string };

const exampleNotenIn = (system: Notensystem): ReadonlyArray<ExampleNote> =>
  leistungsartReihenfolge.flatMap((kind) =>
    exampleNoten
      .filter((example) => example.kind === kind)
      .map(({ note }, index) => ({
        id: `${kind}-${index}`,
        notenwert: system === 'punkte' ? toNotenpunkte(note, 'sechser') : note,
        individualGewichtung: 1,
        leistungsart: kind,
      })),
  );

export type ExampleRow = {
  readonly kind: Leistungsart;
  readonly label: string;
  readonly noten: ReadonlyArray<{ readonly id: string; readonly text: string }>;
  /** The one Note the Noten of a collected Art count as. */
  readonly sammelnote: string | null;
  /** "je 17 %", "zusammen 17 %" or "17 %". */
  readonly share: string;
};

export type CalculationExampleModel = {
  readonly ruler: RulerModel;
  readonly rows: ReadonlyArray<ExampleRow>;
  /** "Schriftlich 9,42 P. (60 %) · mündlich 13,5 P. (40 %)" when a Verhältnis was announced. */
  readonly wertungsbereiche: string | null;
  readonly schnitt: string;
  /** The whole example in one sentence, as the name of the figure. */
  readonly summary: string;
};

const row = (
  kind: Leistungsart,
  noten: ReadonlyArray<ExampleNote>,
  context: {
    readonly gewichtung: Fachgewichtung;
    readonly shares: ReadonlyMap<string, number>;
    readonly system: Notensystem;
  },
): ExampleRow => {
  const { gewichtung, shares, system } = context;
  const collected =
    gewichtung.arten[kind].sammlung === 'gesammelt' && noten.length > 1;
  const collectedNote = collected ? sammelnote(noten) : null;
  const first = shares.get(noten[0]?.id ?? '') ?? 0;
  const total = noten.reduce(
    (sum, note) => sum + (shares.get(note.id) ?? 0),
    0,
  );
  const single =
    noten.length === 1 ? anteilText(first) : `je ${anteilText(first)}`;
  return {
    kind,
    label: leistungsartLabel[kind],
    noten: noten.map((note) => ({
      id: note.id,
      text: formatNote(note.notenwert, system),
    })),
    sammelnote:
      collectedNote === null ? null : formatNote(collectedNote, system),
    share: collected ? `zusammen ${anteilText(total)}` : single,
  };
};

/** Stands where a Schnitt cannot be calculated. */
const missing = '–';

const wertungsbereichLine = (
  gewichtung: Fachgewichtung,
  evaluation: ReturnType<typeof evaluateFach>,
  system: Notensystem,
): string | null => {
  const { verhaeltnis } = gewichtung;
  if (
    verhaeltnis === null ||
    verhaeltnis.schriftlich + verhaeltnis.muendlich <= 0
  ) {
    return null;
  }
  const percent = verhaeltnisProzent(verhaeltnis);
  // Each half stays on one line: a break belongs at the dot between them.
  const half = (name: string, value: number | null, share: number): string =>
    `${name} ${value === null ? missing : formatNote(value, system)} (${share} %)`.replaceAll(
      ' ',
      nbsp,
    );
  return `${half('Schriftlich', evaluation.schriftlichAverage, percent.schriftlich)} · ${half('mündlich', evaluation.muendlichAverage, percent.muendlich)}`;
};

/** A date that only keeps the discs in the order of the example. */
const landingDate = (index: number): string =>
  `2000-01-${`${index + 1}`.padStart(2, '0')}`;

/**
 * What the Gewichtung being edited makes of the example Noten. Shares and
 * Schnitt come from the functions every Fach is calculated with, so the
 * example can never show something the app would not calculate.
 */
export const calculationExample = (
  gewichtung: Fachgewichtung,
  system: Notensystem,
): CalculationExampleModel => {
  const noten = exampleNotenIn(system);
  const shares = leistungsanteile(noten, gewichtung);
  const evaluation = evaluateFach(noten, gewichtung);
  const schnitt =
    evaluation.average === null
      ? missing
      : formatNote(evaluation.average, system);
  return {
    ruler: {
      points: noten.map((note, index) => {
        const share = shares.get(note.id) ?? 0;
        const label = leistungsartLabel[note.leistungsart];
        return {
          id: note.id,
          value: note.notenwert,
          mass: share,
          kind:
            bereichDerLeistungsart[note.leistungsart] === 'schriftlich'
              ? 'schriftlich'
              : 'muendlich',
          state: 'graded',
          date: landingDate(index),
          note: label,
          tip: `${label} · ${formatNote(note.notenwert, system)} · zählt ${anteilText(share)}`,
        };
      }),
      fulcrum: evaluation.average,
      caption: 'Schnitt im Beispiel',
    },
    rows: leistungsartReihenfolge.map((kind) =>
      row(
        kind,
        noten.filter((note) => note.leistungsart === kind),
        { gewichtung, shares, system },
      ),
    ),
    wertungsbereiche: wertungsbereichLine(gewichtung, evaluation, system),
    schnitt,
    summary: `Rechenbeispiel mit ${noten.length} erfundenen Noten: Schnitt ${schnitt}`,
  };
};
