import { ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Fachgewichtung, Notensystem } from '#/shared/noten/notenwert.ts';
import { hintClass } from '#/shared/ui/form-classes.ts';
import { iconStroke } from '#/shared/ui/icon.ts';
import { flag } from '#/shared/ui/ruler/disc-look.ts';
import { Ruler } from '#/shared/ui/ruler/ruler.tsx';
import type { ExampleRow } from './calculation-example-model.ts';
import { calculationExample } from './calculation-example-model.ts';

/** The example Noten are not dated, so no disc hangs lower for being near. */
const noDate = '2000-01-01';

const cellClass = 'border-line-soft border-t py-2 align-baseline';

/** The arrow from the Noten of a Sammlung to the one Note they count as, at the size of the text. */
const arrowSize = 14;

const ExampleRowView = ({
  highlightId,
  onHighlight,
  row,
}: {
  readonly highlightId: string | null;
  readonly onHighlight: (id: string | null) => void;
  readonly row: ExampleRow;
}) => (
  <tr>
    <th className={`${cellClass} pr-3 text-left font-bold`} scope="row">
      {row.label}
    </th>
    <td className={`${cellClass} pr-3`}>
      <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        {row.noten.map((note, index) => (
          <span className="flex items-baseline gap-x-1.5" key={note.id}>
            {index === 0 ? null : <span aria-hidden="true">·</span>}
            <span
              className="-mx-0.5 whitespace-nowrap px-0.5 transition-colors duration-150 ease-standard data-marked:bg-ruler data-marked:text-ruler-ink"
              data-marked={flag(note.id === highlightId)}
              onPointerEnter={() => onHighlight(note.id)}
              onPointerLeave={() => onHighlight(null)}
            >
              {note.text}
            </span>
          </span>
        ))}
        {row.sammelnote === null ? null : (
          <span className="inline-flex items-center gap-1 self-center whitespace-nowrap text-ink-soft">
            <ArrowRight
              aria-hidden={true}
              size={arrowSize}
              strokeWidth={iconStroke}
            />
            <span className="sr-only">zusammen</span>
            {row.sammelnote}
          </span>
        )}
      </span>
    </td>
    <td className={`${cellClass} whitespace-nowrap text-right`}>{row.share}</td>
  </tr>
);

/**
 * Shows on made-up Noten what the Gewichtung being edited calculates: the
 * Noten lie on the ruler as they would on the Noten page, a disc's area is
 * the share its Note counts, and the fulcrum stands under the Schnitt. The
 * table under the figure says the same in figures.
 */
export const CalculationExample = ({
  gewichtung,
  system,
}: {
  readonly gewichtung: Fachgewichtung;
  readonly system: Notensystem;
}) => {
  const example = useMemo(
    () => calculationExample(gewichtung, system),
    [gewichtung, system],
  );
  const [highlightId, setHighlightId] = useState<string | null>(null);
  return (
    <section aria-label="Rechenbeispiel">
      <h4 className="font-bold text-lg">Rechenbeispiel</h4>
      <p className={`mt-1 ${hintClass}`}>
        Acht erfundene Noten, gerechnet mit dieser Gewichtung. Die Fläche einer
        Scheibe zeigt, wie viel die Note zählt.
      </p>
      <Ruler
        className="mt-3"
        highlightId={highlightId}
        label={example.summary}
        model={example.ruler}
        onHighlight={setHighlightId}
        system={system}
        today={noDate}
        variant="bench"
      />
      <table className="mt-3 w-full border-collapse text-sm">
        <caption className="sr-only">
          Die Noten des Rechenbeispiels und ihr Anteil am Schnitt
        </caption>
        <thead>
          <tr className="text-ink-soft text-xs">
            <th className="pb-1.5 text-left font-normal" scope="col">
              Leistungsart
            </th>
            <th className="pb-1.5 text-left font-normal" scope="col">
              Noten
            </th>
            <th className="pb-1.5 text-right font-normal" scope="col">
              Zählt
            </th>
          </tr>
        </thead>
        <tbody>
          {example.rows.map((row) => (
            <ExampleRowView
              highlightId={highlightId}
              key={row.kind}
              onHighlight={setHighlightId}
              row={row}
            />
          ))}
        </tbody>
      </table>
      <p className="border-line-soft border-t pt-2.5 text-sm">
        {example.wertungsbereiche === null ? null : (
          <span className="block text-ink-soft">
            {example.wertungsbereiche}
          </span>
        )}
        Schnitt <span className="font-bold">{example.schnitt}</span>
      </p>
    </section>
  );
};
