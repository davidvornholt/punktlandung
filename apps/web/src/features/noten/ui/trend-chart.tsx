import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import type { TrendEntry } from '../services/trend-calculation.ts';
import { createTrendTextModel } from './trend-text-model.ts';

const chartHeight = 280;
const chartMargin = { top: 8, right: 8, bottom: 0, left: -16 } as const;
const maxNotenpunkte = 15;
const axisFont = 12;
const yAxisTicks = 6;
const pointRadius = 2;

const shortDate = (iso: string): string => {
  const [, month, tag] = iso.split('-');
  return `${tag}.${month}.`;
};

/**
 * Die Verlaufslinie: alle Noten als Notenpunkte (Akzentlinie) und der
 * laufende gewichtete Gesamtschnitt (Primärlinie). Farben kommen
 * ausschließlich aus den Theme-Variablen, da Utility-Klassen auf
 * SVG-Attribute nicht wirken. Die vollständige Textalternative folgt als
 * für Screenreader zugängliche Datentabelle.
 */
export const TrendChart = ({
  entries,
}: {
  readonly entries: ReadonlyArray<TrendEntry>;
}) => {
  const textModel = createTrendTextModel(entries);

  return (
    <figure>
      <div aria-hidden="true">
        <ResponsiveContainer height={chartHeight} width="100%">
          <LineChart data={[...entries]} margin={chartMargin}>
            <CartesianGrid stroke="var(--pl-border)" vertical={false} />
            <XAxis
              dataKey="date"
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
            <Line
              dataKey="notenpunkte"
              dot={{ fill: 'var(--pl-accent)', r: pointRadius, stroke: 'none' }}
              isAnimationActive={false}
              name="Einzelnoten"
              stroke="var(--pl-accent)"
              strokeWidth={1}
              type="monotone"
            />
            <Line
              dataKey="average"
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
      <figcaption className="mt-2 text-ink-faint text-sm">
        {textModel.summary} Dünne Linie: Einzelnoten, kräftige Linie: laufender
        Schnitt.
      </figcaption>
      <div className="sr-only">
        <table>
          <caption>Notenverlauf als Datentabelle</caption>
          <thead>
            <tr>
              <th scope="col">Datum</th>
              <th scope="col">Fach</th>
              <th scope="col">Einzelwert in Notenpunkten</th>
              <th scope="col">Laufender Schnitt in Notenpunkten</th>
            </tr>
          </thead>
          <tbody>
            {textModel.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.fach}</td>
                <td>{row.notenpunkte}</td>
                <td>{row.average}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
};
