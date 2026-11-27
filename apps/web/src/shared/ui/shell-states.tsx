import { Link, useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { BrandMark } from './brand-mark.tsx';
import { primaryButtonClass } from './form-classes.ts';

const noticeClass = 'grid justify-items-center gap-3.5 text-center';
/** Inside the shell a notice keeps its distance from the top bar. Standing alone it is centred by its page, right under the mark. */
const inShellClass = `${noticeClass} py-16`;
const titleClass = 'text-balance font-bold text-3xl tracking-[-0.015em]';
const textClass = 'mb-3 max-w-[38ch] text-pretty text-ink-soft';

/**
 * A page that stands alone, without the shell: signing in, an address that
 * leads nowhere, a page that could not be loaded.
 */
export const StandalonePage = ({
  children,
}: {
  readonly children: ReactNode;
}) => (
  // More room below than above: a block centred to the pixel looks as if it had slipped down.
  <main className="grid min-h-svh place-content-center justify-items-center gap-3.5 px-6 pt-12 pb-[max(3rem,14svh)] text-center">
    {children}
  </main>
);

const NotFoundText = () => (
  <>
    <h1 className={titleClass}>Diese Seite gibt es nicht</h1>
    <p className={textClass}>
      Unter dieser Adresse liegt nichts. Vielleicht ist der Link veraltet, oder
      was er gezeigt hat, wurde gelöscht.
    </p>
    <Link className={primaryButtonClass} to="/">
      Zur Übersicht
    </Link>
  </>
);

const LoadErrorText = ({ reset }: { readonly reset: () => void }) => {
  const router = useRouter();
  return (
    <>
      <h1 className={titleClass}>Die Seite konnte nicht geladen werden</h1>
      <p className={textClass}>
        Meist liegt das an der Verbindung. Prüfe sie und versuche es erneut.
      </p>
      <button
        className={primaryButtonClass}
        onClick={() => {
          // Loads the page's data again, then draws the page again. If loading fails again, so does drawing, and this notice is back.
          router.invalidate().then(reset, reset);
        }}
        type="button"
      >
        Erneut versuchen
      </button>
    </>
  );
};

/** What a page inside the shell shows when its address leads to nothing. */
export const NotFoundNotice = () => (
  <div className={inShellClass}>
    <NotFoundText />
  </div>
);

/**
 * What a page inside the shell shows when it could not be loaded, with the
 * way to try again. It takes what the router hands an error component.
 */
export const LoadErrorNotice = ({ reset }: { readonly reset: () => void }) => (
  <div className={inShellClass}>
    <LoadErrorText reset={reset} />
  </div>
);

/** The mark above a notice that stands alone is twice the size it has in the top bar. */
const standaloneMarkHeight = 52;

/** An address that leads to no page at all, so there is no shell around it. */
export const StandaloneNotFound = () => (
  <StandalonePage>
    <BrandMark className="mb-3" height={standaloneMarkHeight} />
    <div className={noticeClass}>
      <NotFoundText />
    </div>
  </StandalonePage>
);

/** The shell itself could not be loaded. */
export const StandaloneLoadError = ({
  reset,
}: {
  readonly reset: () => void;
}) => (
  <StandalonePage>
    <BrandMark className="mb-3" height={standaloneMarkHeight} />
    <div className={noticeClass}>
      <LoadErrorText reset={reset} />
    </div>
  </StandalonePage>
);

/** The first page is not there yet, for instance while the session is being checked. */
export const StandalonePending = () => (
  <StandalonePage>
    <BrandMark className="mb-3" height={standaloneMarkHeight} motion="sways" />
    <p className="text-ink-soft" role="status">
      Punktlandung wird geladen …
    </p>
  </StandalonePage>
);
