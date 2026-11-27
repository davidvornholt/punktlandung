import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type ReactNode, useRef } from 'react';

import { zeugnisKey } from '#/shared/query/query-keys.ts';
import { LoadingHint, QueryError } from '#/shared/ui/query-state.tsx';
import { retryWithFocus } from '#/shared/ui/refresh-retry.ts';
import type { Zeugnis } from '../services/zeugnis-service.ts';
import { ZeugnisSheet } from './zeugnis-sheet.tsx';

/**
 * Loads the Zeugnis of a Halbjahr and shows it. While another Halbjahr is
 * being loaded the one shown stays, set back, so the page does not jump; the
 * new one then arrives as a new sheet, with its discs landing.
 *
 * The server call comes in as `load`, so the sheet needs no server runtime
 * and its loading and failing can be shown in a story.
 */
export const Zeugnisblatt = ({
  halbjahrId,
  load,
  today,
}: {
  readonly halbjahrId: string;
  readonly load: (halbjahrId: string) => Promise<Zeugnis>;
  /** ISO date. */
  readonly today: string;
}) => {
  const zeugnisQuery = useQuery({
    queryKey: zeugnisKey(halbjahrId),
    queryFn: () => load(halbjahrId),
    placeholderData: keepPreviousData,
  });
  const zeugnis = zeugnisQuery.data;
  const loadingNext = zeugnisQuery.isPlaceholderData;
  const sectionRef = useRef<HTMLElement>(null);
  const shell = (children: ReactNode) => (
    <section
      aria-busy={loadingNext}
      aria-label="Zeugnisvorschau"
      ref={sectionRef}
      tabIndex={-1}
    >
      {children}
    </section>
  );

  if (zeugnisQuery.isPending) {
    return shell(<LoadingHint text="Zeugnis wird berechnet …" />);
  }
  const retry = retryWithFocus(() => zeugnisQuery.refetch(), sectionRef);
  // When only a reload fails, the Zeugnis computed last stays.
  if (zeugnis === undefined) {
    return shell(
      <QueryError
        onRetry={retry}
        text="Das Zeugnis konnte nicht berechnet werden. Prüfe die Verbindung und versuche es erneut."
      />,
    );
  }

  return shell(
    <>
      {zeugnisQuery.isError ? (
        <div className="mb-6">
          <QueryError
            onRetry={retry}
            text="Das Zeugnis konnte nicht aktualisiert werden. Angezeigt wird die zuletzt berechnete Vorschau; prüfe die Verbindung und versuche es erneut."
          />
        </div>
      ) : null}
      {loadingNext ? (
        <p className="sr-only" role="status">
          Zeugnis wird berechnet …
        </p>
      ) : null}
      <div
        className={`transition-opacity duration-150 ease-standard ${loadingNext ? 'opacity-45' : ''}`}
      >
        <ZeugnisSheet key={zeugnis.termId} today={today} zeugnis={zeugnis} />
      </div>
    </>,
  );
};
