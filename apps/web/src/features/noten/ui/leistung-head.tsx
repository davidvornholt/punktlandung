import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { Ref } from 'react';

import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import { Flag } from '#/shared/ui/flag.tsx';
import { iconStroke } from '#/shared/ui/icon.ts';
import type {
  LeistungDetail as Detail,
  Leistung,
} from '../services/noten-service.ts';
import { leistungState } from './fach-ruler.ts';
import { leadOf, titleOf } from './leistung-model.ts';
import { DotLine } from './noten-dot-line.tsx';
import { dotSeparator } from './noten-text.ts';

/** The arrow of the way back is a little larger than an icon inside a button. */
const backIconSize = 17;

const backClass =
  'mt-4 inline-flex min-h-10 items-center gap-2 text-[0.90625rem] text-ink-soft transition-colors duration-100 ease-standard hover:text-ink';

/**
 * The way back: to the Noten of the Halbjahr, at the Fach the Leistung is
 * in. Without a Leistung it leads to the Noten page as it opens by itself.
 */
const Back = ({ detail }: { readonly detail: Detail | null }) =>
  detail === null ? (
    <Link className={backClass} to="/noten">
      <ArrowLeft
        aria-hidden={true}
        size={backIconSize}
        strokeWidth={iconStroke}
      />
      Noten
    </Link>
  ) : (
    <Link
      className={backClass}
      search={{ halbjahr: detail.halbjahr.id, fach: detail.leistung.fachId }}
      to="/noten"
    >
      <ArrowLeft
        aria-hidden={true}
        size={backIconSize}
        strokeWidth={iconStroke}
      />
      <span>
        <span className="sr-only">Zurück zu den Noten in </span>
        {detail.leistung.fachName}
      </span>
    </Link>
  );

/**
 * The Note is what the page is about, so it is the largest thing on it. A
 * Leistung without one says in its place why there is none.
 */
const Status = ({
  leistung,
  system,
  today,
}: {
  readonly leistung: Leistung;
  readonly system: Notensystem;
  readonly today: string;
}) => {
  if (leistung.status === 'graded') {
    const [figure, unit] = formatNote(leistung.wert, system).split(' ');
    return (
      <p className="flex-none" data-leistung-status="graded">
        <span className="sr-only">Note: </span>
        <span className="font-bold desk:text-5xl text-[3.75rem] leading-[0.82] tracking-[-0.03em]">
          {figure}
          {unit === undefined ? null : (
            <span className="ml-0.5 text-[1.75rem] tracking-normal">
              {' '}
              {unit}
            </span>
          )}
        </span>
      </p>
    );
  }
  return leistungState(leistung, today) === 'missing' ? (
    <p
      className="flex-none desk:text-2xl text-xl"
      data-leistung-status="missing"
    >
      <Flag>Note fehlt noch</Flag>
    </p>
  ) : (
    <p
      className="flex-none desk:text-2xl text-ink-soft text-xl"
      data-leistung-status="pending"
    >
      ausstehend
    </p>
  );
};

/**
 * The head of the page of a Leistung: the way back, what it is, when it was,
 * and its Note. While there is no Leistung to show, the head says only which
 * page this is; the heading stays the same element, so it can take the
 * keyboard when a notice below it goes away.
 */
export const LeistungHead = ({
  detail,
  headingRef,
  today,
}: {
  /** `null`: the Leistung is not loaded, or there is none. */
  readonly detail: Detail | null;
  readonly headingRef: Ref<HTMLHeadingElement>;
  /** ISO date. */
  readonly today: string;
}) => {
  const title = detail === null ? null : titleOf(detail.leistung);
  return (
    <>
      <Back detail={detail} />
      <header className="flex desk:flex-row flex-col desk:items-end desk:justify-between desk:gap-6 gap-4 border-line border-b pt-1.5 desk:pb-[1.375rem] pb-[1.125rem]">
        <div className="min-w-0">
          <h1
            className="wrap-break-word font-bold text-3xl tracking-[-0.015em] focus-visible:outline-none"
            ref={headingRef}
            tabIndex={-1}
          >
            {title === null ? 'Leistung' : title.art}
            {title === null || title.notiz === null ? null : (
              <span className="font-normal"> · {title.notiz}</span>
            )}
          </h1>
          {detail === null ? null : (
            <p className="mt-2 desk:text-ui text-ink-soft text-sm">
              <DotLine
                parts={leadOf({
                  halbjahrLabel: detail.halbjahr.label,
                  leistung: detail.leistung,
                  today,
                }).split(dotSeparator)}
              />
            </p>
          )}
        </div>
        {detail === null ? null : (
          <Status
            leistung={detail.leistung}
            system={detail.halbjahr.system}
            today={today}
          />
        )}
      </header>
    </>
  );
};
