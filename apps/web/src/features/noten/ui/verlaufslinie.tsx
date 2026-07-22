import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import type { VerlaufsEintrag } from '../services/verlauf-berechnung.ts';
import { erstelleVerlaufTextmodell } from './verlauf-textmodell.ts';

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
 * SVG-Attribute nicht wirken. Die vollständige Textalternative folgt als
 * für Screenreader zugängliche Datentabelle.
 */
export const Verlaufslinie = ({
  eintraege,
}: {
  readonly eintraege: ReadonlyArray<VerlaufsEintrag>;
}) => {
  const textmodell = erstelleVerlaufTextmodell(eintraege);

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
        {textmodell.zusammenfassung} Dünne Linie: Einzelnoten, kräftige Linie:
        laufender Schnitt.
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
            {textmodell.zeilen.map((zeile) => (
              <tr key={zeile.kennung}>
                <td>{zeile.datum}</td>
                <td>{zeile.fach}</td>
                <td>{zeile.punkte}</td>
                <td>{zeile.schnitt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
};
