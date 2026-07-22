import { useQuery } from '@tanstack/react-query';

import { zeugnisQueryOptions } from '../server/zeugnis-fns.ts';
import type { Zeugnis } from '../services/zeugnis-service.ts';

const Jahresvorschau = ({ zeugnis }: { readonly zeugnis: Zeugnis }) =>
  zeugnis.jahresvorschau === null ? null : (
    <section className="mt-8">
      <h3 className="font-display text-ink text-xl tracking-tight">
        Jahresvorschau {zeugnis.schoolYear}
      </h3>
      <p className="mt-1 text-ink-muted text-sm">
        Nicht bindende Orientierung aus allen Leistungen beider Halbjahre unter
        den verkündeten Gewichtungen. Die offizielle Zeugnisnote ist eine
        pädagogisch-fachliche Gesamtwertung und keine rein mathematische Note.
      </p>
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="border-border border-b text-left">
            <th
              className="py-2 pr-3 text-ink-faint text-xs uppercase tracking-widest"
              scope="col"
            >
              Fach
            </th>
            <th
              className="py-2 text-ink-faint text-xs uppercase tracking-widest"
              scope="col"
            >
              Vorschau
            </th>
          </tr>
        </thead>
        <tbody>
          {zeugnis.jahresvorschau.map((zeile) => (
            <tr className="border-border border-b" key={zeile.fachId}>
              <th
                className="py-2 pr-3 text-left font-normal text-ink"
                scope="row"
              >
                {zeile.fachName}
              </th>
              <td className="py-2">
                <span className="font-display text-ink text-xl">
                  {zeile.note}
                </span>
                {zeile.grenzfall ? (
                  <span className="ml-3 border border-critical bg-critical-subtle px-2 py-0.5 text-ink text-xs uppercase tracking-widest">
                    * Grenzfall — pädagogisches Ermessen
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );

/** Das Zeugnisblatt: formale Vorschau eines Halbjahreszeugnisses. */
export const Zeugnisblatt = ({ termId }: { readonly termId: string }) => {
  const { data: zeugnis } = useQuery(zeugnisQueryOptions(termId));

  if (zeugnis === undefined) {
    return <p className="mt-6 text-ink-muted">Zeugnis wird berechnet …</p>;
  }

  return (
    <article className="mt-6 border border-border-strong bg-surface p-6 shadow-featured sm:p-8">
      <header className="border-border-strong border-b pb-4 text-center">
        <p className="text-ink-faint text-xs uppercase tracking-widest">
          Zeugnisvorschau
        </p>
        <h2 className="mt-1 font-display text-2xl text-ink tracking-tight">
          Halbjahr {zeugnis.label} · {zeugnis.schoolYear}
        </h2>
      </header>
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-border border-b text-left">
            <th
              className="py-2 pr-3 text-ink-faint text-xs uppercase tracking-widest"
              scope="col"
            >
              Fach
            </th>
            <th
              className="py-2 pr-3 text-ink-faint text-xs uppercase tracking-widest"
              scope="col"
            >
              Noten
            </th>
            <th
              className="py-2 text-ink-faint text-xs uppercase tracking-widest"
              scope="col"
            >
              Halbjahresnote
            </th>
          </tr>
        </thead>
        <tbody>
          {zeugnis.zeilen.map((zeile) => (
            <tr className="border-border border-b" key={zeile.fachId}>
              <th
                className="py-2 pr-3 text-left font-normal text-ink"
                scope="row"
              >
                {zeile.fachName}
              </th>
              <td className="py-2 pr-3 text-ink-muted text-sm">
                {zeile.anzahlNoten}
              </td>
              <td className="py-2 font-display text-ink text-xl">
                {zeile.anzeige ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-6 flex items-baseline justify-between">
        <span className="text-ink-faint text-xs uppercase tracking-widest">
          Schnitt aller Halbjahresnoten
        </span>
        <span className="font-display text-4xl text-ink tracking-tight">
          {zeugnis.gesamtschnitt ?? '—'}
        </span>
      </p>
      {zeugnis.zeilen.length === 0 ? (
        <div className="mt-4 border border-border bg-surface-sunken p-4">
          <p className="text-ink-muted">
            Ohne Fächer bleibt das Zeugnisblatt leer. Lege zuerst Fächer an.
          </p>
        </div>
      ) : null}
      <Jahresvorschau zeugnis={zeugnis} />
    </article>
  );
};
