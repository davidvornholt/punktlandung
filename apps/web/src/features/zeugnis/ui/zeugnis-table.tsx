import { Link } from '@tanstack/react-router';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { Zeugnis, ZeugnisRow } from '../services/zeugnis-service.ts';
import { RoundingMagnifier } from './rounding-magnifier.tsx';
import { isLanded } from './zeugnis-model.ts';
import {
  cellClass,
  fachNameClass,
  headClass,
  rowClass,
} from './zeugnis-table-classes.ts';
import { noteParts } from './zeugnis-text.ts';

const countClass = 'hidden text-right desk:table-cell';

/** A column's name, shortened where the table has a phone's width. */
const Heading = ({
  long,
  short,
}: {
  readonly long: string;
  readonly short: string;
}) => (
  <>
    <span className="desk:hidden">{short}</span>
    <span className="desk:inline hidden">{long}</span>
  </>
);

/** The name of a Fach, with the remark that it is no longer kept set back. */
export const FachName = ({
  row,
}: {
  readonly row: { readonly fachName: string; readonly archived: boolean };
}) => (
  <>
    {row.fachName}
    {row.archived ? (
      <span className="font-normal text-ink-soft text-sm"> (archiviert)</span>
    ) : null}
  </>
);

/** A Note with its figure set large and its unit beside it: "11 P.". */
export const NoteFigure = ({ text }: { readonly text: string }) => {
  const { figure, unit } = noteParts(text);
  return (
    <>
      <b className="text-2xl">{figure}</b>
      {unit === null ? null : ` ${unit}`}
    </>
  );
};

/**
 * A Fachschnitt set on the decimal comma of its column: the whole part ends
 * where the room for a comma and two places begins, whether or not the
 * figure has any.
 */
const DecimalFigure = ({ text }: { readonly text: string }) => {
  const comma = text.indexOf(',');
  return (
    <>
      {comma === -1 ? text : text.slice(0, comma)}
      <span className="inline-block w-[1.55em] text-left">
        {comma === -1 ? '' : text.slice(comma)}
      </span>
    </>
  );
};

const FachRow = ({
  highlighted,
  onHighlight,
  row,
  system,
  termId,
}: {
  readonly highlighted: boolean;
  readonly onHighlight: (id: string | null) => void;
  readonly row: ZeugnisRow;
  readonly system: Notensystem;
  readonly termId: string;
}) => (
  <tr
    className={`${rowClass} transition-colors duration-150 ease-standard ${highlighted ? 'bg-sheet' : ''}`}
    data-highlight={highlighted ? '' : undefined}
    onPointerEnter={() => onHighlight(row.fachId)}
    onPointerLeave={() => onHighlight(null)}
  >
    <th className={`${cellClass} text-left desk:text-lg`} scope="row">
      <Link
        className={`inline-block py-1 font-bold decoration-[1.5px] underline-offset-[3px] hover:underline ${fachNameClass}`}
        onBlur={() => onHighlight(null)}
        onFocus={() => onHighlight(row.fachId)}
        search={{ halbjahr: termId, fach: row.fachId }}
        to="/noten"
      >
        <FachName row={row} />
      </Link>
    </th>
    <td className={`${cellClass} ${countClass}`}>{row.anzahlNoten}</td>
    {isLanded(row) ? (
      <>
        <td className={`${cellClass} whitespace-nowrap text-right`}>
          <DecimalFigure
            text={noteParts(formatNote(row.schnitt, system)).figure}
          />
        </td>
        <td className={`${cellClass} desk:w-[11.875rem] w-[6.75rem]`}>
          <RoundingMagnifier
            halbjahresnote={row.halbjahresnote}
            schnitt={row.schnitt}
            system={system}
          />
        </td>
        <td className={`${cellClass} whitespace-nowrap text-right`}>
          <NoteFigure text={row.anzeige} />
        </td>
      </>
    ) : (
      <td
        className={`${cellClass} text-right text-ink-soft text-sm`}
        colSpan={3}
      >
        {/* A Fach can hold Noten that all carry no weight, for example in a Wertungsbereich whose share is 0. */}
        {row.anzahlNoten === 0 ? 'noch keine Note' : 'keine Note zählt'}
      </td>
    )}
  </tr>
);

/**
 * The Zeugnis as a table: per Fach its Fachschnitt, the rounding under the
 * magnifier and the Halbjahresnote it lands on. A row and its disc on the
 * figure highlight each other.
 */
export const ZeugnisTable = ({
  highlightId,
  onHighlight,
  zeugnis,
}: {
  readonly highlightId: string | null;
  readonly onHighlight: (id: string | null) => void;
  readonly zeugnis: Zeugnis;
}) => (
  <table className="w-full border-collapse">
    <caption className="sr-only">Halbjahresnoten in {zeugnis.label}</caption>
    <thead>
      <tr>
        <th className={`${headClass} text-left`} scope="col">
          Fach
        </th>
        <th className={`${headClass} ${countClass}`} scope="col">
          Noten
        </th>
        <th className={`${headClass} text-right`} scope="col">
          <Heading long="Fachschnitt" short="Schnitt" />
        </th>
        <th className={`${headClass} text-center`} scope="col">
          <Heading long="Gerundet auf" short="Gerundet" />
        </th>
        <th className={`${headClass} text-right`} scope="col">
          <Heading long="Halbjahresnote" short="Note" />
        </th>
      </tr>
    </thead>
    <tbody>
      {zeugnis.zeilen.map((row) => (
        <FachRow
          highlighted={row.fachId === highlightId}
          key={row.fachId}
          onHighlight={onHighlight}
          row={row}
          system={zeugnis.system}
          termId={zeugnis.termId}
        />
      ))}
    </tbody>
  </table>
);
