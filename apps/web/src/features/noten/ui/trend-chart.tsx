import { useEffect, useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import type { TrendEntry } from '../services/trend-calculation.ts';
import {
  createTrendPointText,
  createTrendTextModel,
} from './trend-text-model.ts';

const chartHeight = 280;
const chartMargin = { top: 8, right: 8, bottom: 0, left: -16 } as const;
const maxNotenpunkte = 15;
const axisFont = 12;
const yAxisTicks = 6;
const pointRadius = 2;
const activePointRadius = 4;

const shortDate = (iso: string): string => {
  const [, month, day] = iso.split('-');
  return `${day}.${month}.`;
};

/**
 * Der Tooltip zeigt, welche Note hinter einem Punkt der Akzentlinie steht.
 * Recharts liefert den Datensatz der Reihe untypisiert zurück; er stammt aus
 * genau der Liste, die dieses Modul selbst an das Diagramm übergibt.
 */
const TrendPointCard = ({ entry }: { readonly entry: TrendEntry }) => {
  const point = createTrendPointText(entry);
  return (
    <div className="border border-border bg-surface px-3 py-2 shadow-card">
      <p className="text-ink-faint text-xs uppercase tracking-widest">
        {[point.halbjahr, point.leistungsart, point.date].join(' · ')}
      </p>
      <p className="mt-1 font-display text-ink text-lg tracking-tight">
        {point.fach}
      </p>
      <p className="flex items-baseline gap-2">
        <span className="font-display text-2xl text-ink tracking-tight">
          {point.note}
        </span>
        {point.notenpunkte === null ? null : (
          <span className="text-ink-muted text-sm">{point.notenpunkte}</span>
        )}
      </p>
    </div>
  );
};

const TrendTooltip = ({ active, payload }: TooltipContentProps) => {
  const entry = payload.at(0)?.payload as TrendEntry | undefined;
  return active && entry !== undefined ? (
    <TrendPointCard entry={entry} />
  ) : null;
};

const touchTargetRadius = 22;

/**
 * Die Verlaufslinie: alle Noten als Notenpunkte (Akzentlinie) und der
 * laufende gewichtete Gesamtschnitt (Primärlinie). Farben kommen
 * ausschließlich aus den Theme-Variablen, da Utility-Klassen auf
 * SVG-Attribute nicht wirken. Die vollständige Datentabelle folgt in einer
 * sichtbaren nativen Aufklappfläche.
 */
export const TrendChart = ({
  entries,
}: {
  readonly entries: ReadonlyArray<TrendEntry>;
}) => {
  const textModel = createTrendTextModel(entries);
  const chartRef = useRef<HTMLDivElement>(null);
  const selectedCardRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<TrendEntry | null>(null);
  const pinned =
    selected !== null && entries.includes(selected) ? selected : null;
  useEffect(() => {
    if (pinned === null) {
      return;
    }
    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !chartRef.current?.contains(event.target) &&
        !selectedCardRef.current?.contains(event.target)
      ) {
        setSelected(null);
      }
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [pinned]);
  const selectAt = (clientX: number, clientY: number) => {
    let nearest: TrendEntry | null = null;
    let nearestDistance = touchTargetRadius;
    chartRef.current
      ?.querySelectorAll('.recharts-line-dot')
      .forEach((dot, index) => {
        const bounds = dot.getBoundingClientRect();
        const distance = Math.hypot(
          clientX - bounds.x - bounds.width / 2,
          clientY - bounds.y - bounds.height / 2,
        );
        if (distance <= nearestDistance) {
          nearest = entries[index] ?? null;
          nearestDistance = distance;
        }
      });
    setSelected(nearest);
  };

  return (
    <figure>
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Pointer inspection supplements the complete accessible data table. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Pointer inspection supplements the complete keyboard-accessible data table below. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard users inspect the complete data table; Escape dismisses pointer selection. */}
      <div
        ref={chartRef}
        onClick={(event) => selectAt(event.clientX, event.clientY)}
      >
        <ResponsiveContainer height={chartHeight} width="100%">
          <LineChart
            accessibilityLayer={false}
            aria-hidden="true"
            data={[...entries]}
            margin={chartMargin}
          >
            <CartesianGrid stroke="var(--pl-border)" vertical={false} />
            <XAxis
              dataKey="datum"
              stroke="var(--pl-ink-faint)"
              tick={{ fill: 'var(--pl-ink-faint)', fontSize: axisFont }}
              tickFormatter={shortDate}
              tickLine={false}
            />
            <YAxis
              domain={[0, maxNotenpunkte]}
              stroke="var(--pl-ink-faint)"
              tick={{ fill: 'var(--pl-ink-faint)', fontSize: axisFont }}
              tickCount={yAxisTicks}
              tickLine={false}
            />
            <Tooltip
              content={TrendTooltip}
              active={pinned === null ? undefined : false}
              cursor={{ stroke: 'var(--pl-border-strong)', strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Line
              activeDot={{
                fill: 'var(--pl-accent)',
                r: activePointRadius,
                stroke: 'none',
              }}
              dataKey="punkte"
              dot={{ fill: 'var(--pl-accent)', r: pointRadius, stroke: 'none' }}
              isAnimationActive={false}
              name="Einzelnoten"
              stroke="var(--pl-accent)"
              strokeWidth={1}
              type="monotone"
            />
            <Line
              activeDot={false}
              dataKey="schnitt"
              dot={false}
              isAnimationActive={false}
              name="Gesamtschnitt"
              stroke="var(--pl-primary)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {pinned === null ? null : (
        <aside
          ref={selectedCardRef}
          aria-label="Ausgewählte Note"
          aria-live="polite"
          className="mt-3"
        >
          <TrendPointCard entry={pinned} />
        </aside>
      )}
      <figcaption className="mt-2 text-ink-faint text-sm">
        {textModel.summary} Dünne Linie: Einzelnoten, kräftige Linie: laufender
        Schnitt. Einen Punkt antippen, um die Note festzuhalten; außerhalb
        tippen oder Escape drücken schließt die Auswahl.
      </figcaption>
      <details className="mt-4 border border-border bg-surface-sunken">
        <summary className="cursor-pointer px-3 py-2 text-ink text-sm marker:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
          Notenpunkte als Tabelle anzeigen
        </summary>
        <div className="overflow-x-auto border-border border-t">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <caption className="sr-only">Notenverlauf als Datentabelle</caption>
            <thead className="bg-surface text-ink-faint text-xs uppercase tracking-widest">
              <tr className="[&_th]:px-3 [&_th]:py-2 [&_th]:font-medium">
                <th scope="col">Halbjahr</th>
                <th scope="col">Leistungsart</th>
                <th scope="col">Datum</th>
                <th scope="col">Fach</th>
                <th scope="col">Eingetragene Note</th>
                <th scope="col">Kurvenwert in Notenpunkten</th>
                <th scope="col">Laufender Schnitt in Notenpunkten</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-border [&_td]:border-t [&_td]:px-3 [&_td]:py-2 [&_td]:text-ink-muted">
              {textModel.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.halbjahr}</td>
                  <td>{row.leistungsart}</td>
                  <td>{row.date}</td>
                  <td className="text-ink">{row.fach}</td>
                  <td>{row.note}</td>
                  <td>{row.notenpunkte}</td>
                  <td>{row.average}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
};
