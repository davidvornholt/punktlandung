import { ChevronRight } from 'lucide-react';
import { useRef } from 'react';

import { conversionTable } from '#/shared/noten/conversion-table.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { buttonIconSize, iconStroke } from '#/shared/ui/icon.ts';
import { SectionHeader } from '#/shared/ui/page-header.tsx';
import { RulerBar } from '#/shared/ui/ruler/ruler-bar.tsx';
import { useHostWidth } from '#/shared/ui/ruler/ruler-hooks.ts';
import { scaleFor } from '#/shared/ui/ruler/scale.ts';
import { notenpunkteMarks, scaleBar } from './conversion-reference-model.ts';

const proseClass = 'max-w-[68ch] text-pretty text-ink-soft';
const headClass = 'px-1 pb-2 font-normal text-ink-soft text-sm desk:px-2.5';
const cellClass = 'px-1 py-1.5 desk:px-2.5';

/**
 * One of the two bars, as wide as the room it is given. A bar of Noten
 * carries the Notenpunkte along its lower edge; a bar of Notenpunkte brings
 * its Noten itself.
 */
const ScaleFigure = ({
  caption,
  label,
  system,
}: {
  readonly caption: string;
  /** Says for screen readers what the bar shows. */
  readonly label: string;
  readonly system: Notensystem;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const hostWidth = useHostWidth(hostRef);
  const frame = hostWidth === null ? null : scaleBar(hostWidth);
  return (
    <figure className="mt-5">
      {/* The room is kept before the width is known, so nothing below jumps. */}
      <div className="h-[3.375rem]" ref={hostRef}>
        {frame === null ? null : (
          <svg
            aria-label={label}
            className="block overflow-visible"
            height={frame.height}
            role="img"
            viewBox={`0 0 ${frame.width} ${frame.height}`}
            width={frame.width}
          >
            <RulerBar
              height={frame.barHeight}
              numerals={true}
              pitch={frame.pitch}
              scale={scaleFor(system)}
              x0={frame.x0}
              y={frame.y}
            />
            {system === 'sechser'
              ? notenpunkteMarks(frame).map((mark) => (
                  <text
                    className="fill-ruler-note font-bold"
                    data-mark="notenpunkte"
                    fontSize={mark.size}
                    key={mark.text}
                    textAnchor="middle"
                    x={mark.x}
                    y={mark.y}
                  >
                    {mark.text}
                  </text>
                ))
              : null}
          </svg>
        )}
      </div>
      <figcaption className="mt-2 text-ink-soft text-sm">{caption}</figcaption>
    </figure>
  );
};

/** A Note such as "1-2" is not divided at its hyphen at the end of a line. */
const Whole = ({ children }: { readonly children: string }) => (
  <span className="whitespace-nowrap">{children}</span>
);

/** The whole conversion as text: what the two bars show, for reading off and for screen readers. */
const ConversionTable = () => (
  <table className="mt-2 w-full max-w-[22rem] border-collapse">
    <caption className="sr-only">
      Dezimalnoten mit ihrer Notentendenz und ihren Notenpunkten, von 1+ bis 6
    </caption>
    <thead>
      <tr>
        <th className={`${headClass} text-left`} scope="col">
          Note
        </th>
        <th className={`${headClass} text-right`} scope="col">
          Notenpunkte
        </th>
      </tr>
    </thead>
    <tbody>
      {conversionTable.map((row) => (
        <tr
          className="border-line-soft border-t first:border-ink first:border-t-[1.5px]"
          key={row.noteLabel}
        >
          <th
            className={`${cellClass} text-left ${row.tendenz ? 'font-bold' : 'font-normal text-ink-soft'}`}
            scope="row"
          >
            {row.noteLabel} ({row.tendenzLabel})
          </th>
          <td
            className={`${cellClass} whitespace-nowrap text-right ${row.tendenz ? 'font-bold' : 'text-ink-soft'}`}
          >
            {row.tendenz ? null : <span aria-hidden={true}>≈ </span>}
            {row.notenpunkteLabel}
            {row.tendenz ? null : (
              <span className="sr-only"> (interpoliert)</span>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/**
 * A reference, not an input: how Punktlandung converts between Noten and
 * Notenpunkte, where the official Notentendenzen end and its own
 * interpolation begins.
 */
export const ConversionReference = () => (
  <section>
    <SectionHeader title="Zwei Skalen, eine Richtung" />
    <p className={proseClass}>
      In der Kursstufe ist die Skala in Notenpunkten geteilt, bis Klasse 10 in
      Noten. Besser liegt immer rechts. Die jeweils andere Einheit steht an der
      unteren Kante, an den amtlichen Stellen.
    </p>
    <ScaleFigure
      caption="Kursstufe: oben Notenpunkte, unten Noten"
      label="Skala der Notenpunkte 0 bis 15 mit den Noten 6 bis 1 an der unteren Kante"
      system="punkte"
    />
    <ScaleFigure
      caption="Klassen 5 bis 10: oben Noten, unten Notenpunkte"
      label="Skala der Noten 6 bis 1 mit den Notenpunkten 0 bis 14 an den amtlichen Stellen"
      system="sechser"
    />
    <p className={`${proseClass} mt-6`}>
      Damit Punktlandung Halbjahre beider Systeme zusammen zeigen kann, etwa im
      Gesamtschnitt auf der Übersicht, rechnet es jede Note in Notenpunkte um.
      Amtlich festgelegt sind die Notentendenzen: 1+ sind 15&nbsp;Punkte, 1 sind
      14, 1- sind 13, 2+ sind 12 und so weiter bis 6 mit 0&nbsp;Punkten. Die 1+
      ist besser als jede Note der unteren Skala und steht deshalb nur in der
      Tabelle. Zwischennoten wie <Whole>1-2</Whole> stehen in keiner amtlichen
      Tabelle. Dort teilt Punktlandung gleichmäßig zwischen den benachbarten
      Tendenzen.
    </p>
    <details className="group mt-3">
      <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 pr-1.5 text-ink-soft text-sm hover:text-ink">
        <ChevronRight
          aria-hidden={true}
          className="transition-transform duration-150 ease-standard group-open:rotate-90"
          size={buttonIconSize}
          strokeWidth={iconStroke}
        />
        Umrechnungstabelle
      </summary>
      <ConversionTable />
      <p className="mt-3 max-w-[22rem] text-pretty text-ink-soft text-sm">
        ≈ markiert einen Zwischenwert, den Punktlandung selbst errechnet.
      </p>
      <p className={`${proseClass} mt-3 text-sm`}>
        Ein Gesamtschnitt kann zwischen zwei Zeilen liegen: 1,88 bei
        11,5&nbsp;P. liegt zwischen 1,75 (12&nbsp;P.) und 2 (11&nbsp;P.). Suche
        für solche Werte die beiden benachbarten Zeilen. Die Tabelle gilt in
        beide Richtungen.
      </p>
    </details>
  </section>
);
