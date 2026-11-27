import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { type ReactNode, useRef } from 'react';

import { actionErrorText } from '#/shared/ui/action-error.ts';
import { EmptyState } from '#/shared/ui/empty-state.tsx';
import { primaryButtonClass } from '#/shared/ui/form-classes.ts';
import { buttonIconSize, iconStroke } from '#/shared/ui/icon.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';
import { LeistungHead } from './leistung-head.tsx';
import type { LeistungOperations } from './leistung-operations.ts';
import { LeistungPage } from './leistung-page.tsx';
import {
  type LeistungData,
  type LeistungPageInput,
  useLeistungData,
} from './leistung-state.ts';
import type { NotenOperations } from './noten-operations.ts';

export type LeistungDetailProps = Pick<
  LeistungPageInput,
  'eintragen' | 'faecher' | 'notenOperations' | 'onDeleted' | 'onEntryAnswered'
> & {
  readonly leistungId: string;
  readonly leistungOperations: LeistungOperations;
  readonly notenOperations: NotenOperations;
  /** ISO date. */
  readonly today: string;
};

/** The Leistung was deleted, or the link to it never led anywhere. */
const Missing = () => (
  <EmptyState
    text="Sie wurde gelöscht, oder der Link zu ihr ist veraltet."
    title="Diese Leistung gibt es nicht mehr"
  >
    <Link className={primaryButtonClass} to="/noten">
      <ArrowLeft
        aria-hidden={true}
        size={buttonIconSize}
        strokeWidth={iconStroke}
      />
      Zu den Noten
    </Link>
  </EmptyState>
);

/** What stands under the head instead of the page, or above it when only a refresh failed. */
const noticeOf = (
  data: LeistungData,
  retry: () => Promise<void>,
): ReactNode => {
  if (data.state === 'pending') {
    return <LoadingHint text="Leistung wird geladen …" />;
  }
  if (data.state === 'missing') {
    return <Missing />;
  }
  if (data.state === 'failed') {
    return (
      <QueryError
        onRetry={retry}
        text={actionErrorText(
          data.error,
          'Die Leistung konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut.',
        )}
      />
    );
  }
  // A failed refresh keeps the page already shown, so an open entry stays mounted with what was typed.
  return data.refreshError === null ? null : (
    <QueryError
      onRetry={retry}
      text={actionErrorText(
        data.refreshError,
        'Die Leistung konnte nicht aktualisiert werden. Angezeigt wird der zuletzt geladene Stand; prüfe die Verbindung und versuche es erneut.',
      )}
    />
  );
};

/**
 * The page of one Leistung: where it lies among the Leistungen of its Fach,
 * what it does to the Fachschnitt and how much it counts. Here a Leistung
 * that waits gets its Note.
 */
export const LeistungDetail = ({
  leistungId,
  leistungOperations,
  today,
  ...page
}: LeistungDetailProps) => {
  const { data, refetch } = useLeistungData({
    leistungId,
    leistungOperations,
    notenOperations: page.notenOperations,
  });
  // The heading takes the keyboard when a retry removes the button that had it.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const notice = noticeOf(data, retryWithFocus(refetch, headingRef));
  return (
    <>
      <LeistungHead
        detail={data.state === 'loaded' ? data.detail : null}
        headingRef={headingRef}
        today={today}
      />
      {notice === null ? null : <div className="mt-6">{notice}</div>}
      {data.state === 'loaded' ? (
        <LeistungPage
          {...page}
          detail={data.detail}
          noten={data.noten}
          today={today}
        />
      ) : null}
    </>
  );
};
