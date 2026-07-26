import { conversionTable } from '#/shared/noten/conversion-table.ts';

/**
 * Nachschlagewerk, keine Eingabe: zeigt, wie Punktlandung Noten und
 * Notenpunkte ineinander umrechnet, und wo die amtlichen Tendenzen aufhören
 * und die eigene Interpolation anfängt.
 */
export const ConversionReference = () => (
  <section>
    <h2 className="font-display text-2xl text-ink tracking-tight">
      Notenumrechnung
    </h2>
    <p className="mt-2 text-ink-muted">
      Ein Halbjahr rechnet entweder in Noten von 1 bis 6 oder in Notenpunkten
      von 0 bis 15. Damit Punktlandung Halbjahre beider Systeme zusammen zeigen
      kann — etwa im Gesamtschnitt auf der Übersicht — rechnet es jede Note in
      Notenpunkte um.
    </p>
    <p className="mt-2 text-ink-muted">
      Die Ankerwerte sind die amtlichen Notentendenzen: 1+ sind 15 Punkte, 1
      sind 14, 1- sind 13, 2+ sind 12 und so weiter bis 6 mit 0 Punkten.
      Zwischennoten wie 1-2 stehen in keiner amtlichen Tabelle. Dort teilt
      Punktlandung gleichmäßig zwischen den benachbarten Tendenzen und markiert
      das Ergebnis mit ≈. Die Tabelle gilt in beide Richtungen.
    </p>
    <details className="mt-4">
      <summary className="cursor-pointer text-ink-muted text-sm transition-colors duration-150 ease-standard hover:text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
        Umrechnungstabelle anzeigen
      </summary>
      <table className="mt-3 w-full max-w-xs border-collapse">
        <caption className="sr-only">
          Noten mit ihren Notenpunkten, von 1+ bis 6
        </caption>
        <thead>
          <tr className="border-border border-b text-left">
            <th
              className="py-2 pr-3 text-ink-faint text-xs uppercase tracking-widest"
              scope="col"
            >
              Note
            </th>
            <th
              className="py-2 text-ink-faint text-xs uppercase tracking-widest"
              scope="col"
            >
              Notenpunkte
            </th>
          </tr>
        </thead>
        <tbody>
          {conversionTable.map((row) => (
            <tr className="border-border border-b" key={row.noteLabel}>
              <th
                className="py-1.5 pr-3 text-left font-display font-normal text-ink text-lg"
                scope="row"
              >
                {row.noteLabel}
              </th>
              <td className="py-1.5 font-display text-ink text-lg">
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
      <p className="mt-3 max-w-xs text-ink-faint text-xs">
        ≈ markiert einen Zwischenwert, den Punktlandung selbst errechnet.
      </p>
    </details>
  </section>
);
