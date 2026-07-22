import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { VerlaufsEintrag } from '../services/verlauf-berechnung.ts';

const chartHoehe = 280;
const chartRand = { top: 8, right: 8, bottom: 0, left: -16 } as const;
const punkteMax = 15;
const achsenSchrift = 12;
const yAchsenTicks = 6;
const punktRadius = 2;

const datumKurz = (iso: string): string => {
  const [, monat, tag] = iso.split('-');
  return `${tag}.${monat}.`;
};

/**
 * Die Verlaufslinie: alle Noten als Notenpunkte (Akzentlinie) und der
 * laufende gewichtete Gesamtschnitt (Primärlinie). Farben kommen
 * ausschließlich aus den Theme-Variablen, da Utility-Klassen auf
 * SVG-Attribute nicht wirken. Die Textalternative steht in der figcaption.
 */
export const Verlaufslinie = ({
  eintraege,
}: {
  readonly eintraege: ReadonlyArray<VerlaufsEintrag>;
}) => {
  const letzter = eintraege.at(-1);
  const beschreibung =
    letzter === undefined
      ? 'Noch keine Noten für die Verlaufslinie.'
      : `Verlauf aller ${eintraege.length} Noten in Notenpunkten; aktueller gewichteter Gesamtschnitt: ${formatNote(letzter.schnitt, 'punkte')}.`;

  return (
    <figure>
      <div aria-hidden="true">
        <ResponsiveContainer height={chartHoehe} width="100%">
          <LineChart data={[...eintraege]} margin={chartRand}>
            <CartesianGrid stroke="var(--pl-border)" vertical={false} />
            <XAxis
              dataKey="datum"
              stroke="var(--pl-ink-faint)"
              tick={{ fill: 'var(--pl-ink-faint)', fontSize: achsenSchrift }}
              tickFormatter={datumKurz}
              tickLine={false}
            />
            <YAxis
              domain={[0, punkteMax]}
              stroke="var(--pl-ink-faint)"
              tick={{ fill: 'var(--pl-ink-faint)', fontSize: achsenSchrift }}
              tickCount={yAchsenTicks}
              tickLine={false}
            />
            <Line
              dataKey="punkte"
              dot={{ fill: 'var(--pl-accent)', r: punktRadius, stroke: 'none' }}
              isAnimationActive={false}
              name="Einzelnoten"
              stroke="var(--pl-accent)"
              strokeWidth={1}
              type="monotone"
            />
            <Line
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
      <figcaption className="mt-2 text-ink-faint text-sm">
        {beschreibung} Dünne Linie: Einzelnoten, kräftige Linie: laufender
        Schnitt.
      </figcaption>
    </figure>
  );
};
