import { Flag } from '#/shared/ui/flag.tsx';
import { SectionHeader } from '#/shared/ui/page-header.tsx';
import type { JahresvorschauRow } from '../services/zeugnis-service.ts';
import { FachName } from './zeugnis-table.tsx';
import {
  cellClass,
  fachNameClass,
  headClass,
  legendClass,
  rowClass,
} from './zeugnis-table-classes.ts';

/**
 * The whole Note each Fach is heading for over both Halbjahre of a school
 * year. An orientation, and said to be one: the real Zeugnisnote is the
 * teacher's judgement.
 */
export const Jahresvorschau = ({
  rows,
  schoolYear,
}: {
  readonly rows: ReadonlyArray<JahresvorschauRow>;
  readonly schoolYear: string;
}) => (
  <section className="@container mt-11">
    <SectionHeader title={`Jahresvorschau ${schoolYear}`} />
    <div className="grid @[60rem]:grid-cols-[minmax(0,1fr)_16.875rem] items-start gap-x-18 gap-y-2">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Jahresvorschau für das Schuljahr {schoolYear}
        </caption>
        <thead>
          <tr>
            <th className={`${headClass} text-left`} scope="col">
              Fach
            </th>
            <th className={`${headClass} text-right`} scope="col">
              Jahresnote
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={rowClass} key={row.fachId}>
              <th
                className={`${cellClass} ${fachNameClass} text-left font-bold desk:text-lg`}
                scope="row"
              >
                <FachName row={row} />
              </th>
              <td className={`${cellClass} whitespace-nowrap text-right`}>
                {row.grenzfall ? (
                  <span className="mr-3 text-sm">
                    <Flag>Grenzfall</Flag>
                  </span>
                ) : null}
                <b className="text-2xl">{row.note}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={legendClass}>
        <p>
          Eine Orientierung aus allen Leistungen beider Halbjahre unter den
          verkündeten Gewichtungen, nicht bindend. Die Zeugnisnote selbst ist
          eine pädagogisch-fachliche Gesamtwertung und keine rein mathematische
          Note.
        </p>
        {rows.some((row) => row.grenzfall) ? (
          <p>
            Grenzfall: Der Schnitt liegt nahe an ,5. Dort entscheidet die
            Lehrkraft nach pädagogischem Ermessen; genau bei ,5 zeigt die
            Vorschau die schlechtere Note.
          </p>
        ) : null}
      </div>
    </div>
  </section>
);
