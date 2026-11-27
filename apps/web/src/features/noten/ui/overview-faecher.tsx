import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useRef } from 'react';
import { nbsp } from '#/shared/date/date-text.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { faecherKey, notenKey } from '#/shared/query/query-keys.ts';
import { linkClass } from '#/shared/ui/form-classes.ts';
import { SectionHeader } from '#/shared/ui/page-header.tsx';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';
import { measure, tenths } from '#/shared/ui/ruler/geometry.ts';
import { Ruler } from '#/shared/ui/ruler/ruler.tsx';
import { useHostWidth } from '#/shared/ui/ruler/ruler-hooks.ts';
import { scaleFor } from '#/shared/ui/ruler/scale.ts';
import type { Leistung } from '../services/noten-service.ts';
import {
  type FachRow,
  fachRows,
  type OverviewFach,
} from './overview-faecher-model.ts';

/** The columns of a row on a wide screen: the name, the ruler, the Schnitt. */
const rowColumns =
  'grid grid-cols-[minmax(0,1fr)_auto] desk:grid-cols-[124px_minmax(0,1fr)_84px] items-center gap-x-3.5';

const head = {
  height: 14,
  baseline: 11,
  size: 11.5,
  everyNumeralFrom: 20,
} as const;

const noPoints = { points: [], fulcrum: null } as const;

/** The numerals of the scale, once above all rows: they stand where each row's bar has them. */
const ScaleHead = ({ system }: { readonly system: Notensystem }) => {
  const hostRef = useRef<HTMLSpanElement>(null);
  const width = useHostWidth(hostRef);
  const scale = scaleFor(system);
  const frame =
    width === null
      ? null
      : measure({ hostWidth: width, model: noPoints, scale, variant: 'row' });
  return (
    <span className="col-span-2 desk:col-span-1 block min-w-0" ref={hostRef}>
      {frame === null ? null : (
        <svg
          aria-hidden="true"
          className="block"
          height={head.height}
          viewBox={`0 0 ${frame.width} ${head.height}`}
          width={frame.width}
        >
          {scale.numerals
            .filter(
              (numeral) =>
                numeral.major || frame.pitch >= head.everyNumeralFrom,
            )
            .map((numeral) => (
              <text
                className="fill-ink-soft"
                fontSize={head.size}
                key={numeral.unit}
                textAnchor="middle"
                x={tenths(frame.x0 + numeral.unit * frame.pitch)}
                y={head.baseline}
              >
                {numeral.text}
              </text>
            ))}
        </svg>
      )}
    </span>
  );
};

const FachRowLink = ({
  row,
  system,
  today,
}: {
  readonly row: FachRow;
  readonly system: Notensystem;
  readonly today: string;
}) => (
  <Link
    className={`${rowColumns} min-h-[58px] border-line-soft border-t desk:py-0 pt-2 pb-1 transition-colors duration-150 ease-standard hover:bg-sheet`}
    search={{ fach: row.id }}
    to="/noten"
  >
    <span className="pl-0.5 font-bold">{row.name}</span>
    {/* The link is named by what it prints and by `detail`, which says what the ruler shows. */}
    <span
      aria-hidden="true"
      className="desk:order-none order-last col-span-2 desk:col-span-1 block min-w-0"
    >
      <Ruler
        label={row.name}
        model={row.ruler.model}
        system={system}
        today={today}
        variant="row"
      />
    </span>
    <span className="whitespace-nowrap pr-0.5 text-right">
      {row.schnitt === null ? (
        <span aria-hidden="true">–</span>
      ) : (
        <>
          <b className="font-bold desk:text-xl text-lg">
            {row.schnitt.figure}
            {/* Takes the room of the decimals this figure lacks: the column lines up on the comma. */}
            <span aria-hidden="true" className="invisible">
              {row.schnitt.fill}
            </span>
          </b>
          {row.schnitt.unit === null ? null : `${nbsp}${row.schnitt.unit}`}
        </>
      )}
      <span className="sr-only">{row.detail}</span>
    </span>
  </Link>
);

export type OverviewFaecherProps = {
  readonly halbjahr: {
    readonly id: string;
    /** "J1.1" */
    readonly label: string;
    readonly schoolYear: string;
    readonly system: Notensystem;
  };
  /** Loads the Fächer of the Schuljahr. */
  readonly loadFaecher: () => Promise<ReadonlyArray<OverviewFach>>;
  /** Loads the Leistungen of the Halbjahr. */
  readonly loadNoten: () => Promise<ReadonlyArray<Leistung>>;
  /** ISO date. */
  readonly today: string;
};

/**
 * "Fächer in J1.1" on the Übersicht: one row per Fach with the ruler of its
 * Leistungen in the current Halbjahr and its Fachschnitt. A row leads to the
 * Fach on the Noten page. Both lists share their cache with that page.
 */
export const OverviewFaecher = ({
  halbjahr,
  loadFaecher,
  loadNoten,
  today,
}: OverviewFaecherProps) => {
  const faecherQuery = useQuery({
    queryKey: faecherKey(halbjahr.schoolYear),
    queryFn: loadFaecher,
  });
  const notenQuery = useQuery({
    queryKey: notenKey(halbjahr.id),
    queryFn: loadNoten,
  });
  const sectionRef = useRef<HTMLElement>(null);
  const faecher = faecherQuery.data;
  const leistungen = notenQuery.data;
  const rows = useMemo(
    () =>
      faecher === undefined || leistungen === undefined
        ? null
        : fachRows({ faecher, leistungen, system: halbjahr.system, today }),
    [faecher, halbjahr.system, leistungen, today],
  );
  const retry = retryWithFocus(
    () =>
      Promise.all([
        faecherQuery.isError ? faecherQuery.refetch() : faecherQuery,
        notenQuery.isError ? notenQuery.refetch() : notenQuery,
      ]).then((results) => ({
        isSuccess: results.every((result) => result.isSuccess),
      })),
    sectionRef,
  );
  return (
    <section
      aria-label={`Fächer in ${halbjahr.label}`}
      className="focus-visible:outline-none"
      ref={sectionRef}
      tabIndex={-1}
    >
      <SectionHeader title={`Fächer in ${halbjahr.label}`}>
        {rows === null || rows.length === 0
          ? undefined
          : 'Wo jedes Fach im Gleichgewicht ist'}
      </SectionHeader>
      {faecherQuery.isPending || notenQuery.isPending ? (
        <LoadingHint text="Fächer werden geladen …" />
      ) : null}
      {faecherQuery.isError || notenQuery.isError ? (
        <div className="mb-4">
          <QueryError
            onRetry={retry}
            text="Die Fächer konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {rows !== null && rows.length === 0 ? (
        <p className="max-w-[60ch] text-ink-soft">
          Im Schuljahr {halbjahr.schoolYear} gibt es noch kein Fach. Lege deine
          Fächer unter{' '}
          <Link className={`${linkClass} text-ink`} to="/faecher">
            Fächer
          </Link>{' '}
          an.
        </p>
      ) : null}
      {rows === null || rows.length === 0 ? null : (
        <>
          {/* Every row names its Fach and its Schnitt itself, so the column heads are for the eye only. */}
          <div
            aria-hidden="true"
            className={`${rowColumns} desk:pb-1.5 pb-1 text-ink-soft text-xs`}
          >
            <span className="desk:block hidden pl-0.5">Fach</span>
            <ScaleHead system={halbjahr.system} />
            <span className="desk:block hidden pr-0.5 text-right">Schnitt</span>
          </div>
          <ul>
            {rows.map((row) => (
              <li key={row.id}>
                <FachRowLink row={row} system={halbjahr.system} today={today} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
