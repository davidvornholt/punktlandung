import type { ReactNode } from 'react';

import { errorBoxClass } from './form-classes.ts';
import { mainId, type ShellSignOut } from './shell-nav.ts';
import { ShellTabBar } from './shell-tab-bar.tsx';
import { ShellTopBar } from './shell-top-bar.tsx';
import { TooltipLayer } from './tooltip-layer.tsx';

export type { ShellSignOut } from './shell-nav.ts';

/**
 * What surrounds every page of the app: the top bar, on a phone the tab bar,
 * and between them the page at the app's one width.
 */
export const ShellFrame = ({
  children,
  signOut,
}: {
  readonly children: ReactNode;
  readonly signOut: ShellSignOut;
}) => (
  <div className="flex min-h-svh flex-col">
    <a
      className="fixed -top-16 left-3 z-50 bg-ink px-3.5 py-2.5 text-paper focus:top-3"
      href={`#${mainId}`}
    >
      Zum Inhalt springen
    </a>
    <ShellTopBar signOut={signOut} />
    {signOut.failed ? (
      // Stays under the top bar as part of it, because the press that failed may have been far down the page.
      <div className="sticky desk:top-16 top-13 z-10 border-ink border-b-[1.5px] bg-paper">
        <div className="mx-auto max-w-[78rem] desk:px-6 px-4 py-2.5">
          <p className={errorBoxClass} role="alert">
            Die Abmeldung ist fehlgeschlagen. Du bleibst angemeldet; prüfe die
            Verbindung und versuche es erneut.
          </p>
        </div>
      </div>
    ) : null}
    <main
      className="mx-auto w-full max-w-[78rem] flex-1 desk:px-6 px-4 desk:pb-24 pb-[calc(7.5rem+env(safe-area-inset-bottom))] focus-visible:outline-none"
      id={mainId}
      tabIndex={-1}
    >
      {children}
    </main>
    <ShellTabBar signOut={signOut} />
    <TooltipLayer />
  </div>
);
