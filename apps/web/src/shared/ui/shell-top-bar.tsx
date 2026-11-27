import { Link } from '@tanstack/react-router';
import { LogOut, Plus } from 'lucide-react';

import { BrandMark } from './brand-mark.tsx';
import { primaryButtonClass } from './form-classes.ts';
import { buttonIconSize, iconSize, iconStroke } from './icon.ts';
import { IconButton } from './icon-button.tsx';
import { flag } from './ruler/disc-look.ts';
import {
  isPageOpen,
  isPagePending,
  mainPages,
  type ShellSignOut,
  setupPages,
  useIsLoading,
  usePendingPathname,
  useShownPathname,
} from './shell-nav.ts';

/*
 * The full bar needs about 980px. From the phone breakpoint up to 64rem it is
 * drawn tighter and its action keeps only the plus, so nothing runs off the
 * edge of a tablet held upright or of a narrow window.
 */
const navLinkClass =
  'relative flex items-center px-2.5 text-ink-soft transition-colors duration-150 ease-standard hover:text-ink focus-visible:-outline-offset-[7px] data-open:font-bold data-open:text-ink min-[64rem]:px-3.5';

/**
 * The red disc that marks the page you are on is drawn by `shell.css` on
 * `data-part="nav-link"`. The link is marked by `data-open`, which changes
 * with the page that is drawn; see `useShownPathname`. A page that was asked
 * for and is not there yet is marked by `data-pending`: its disc is in the air.
 */
const NavLink = ({
  page,
}: {
  readonly page: (typeof mainPages | typeof setupPages)[number];
}) => {
  const pathname = useShownPathname();
  const pending = usePendingPathname();
  return (
    <Link
      activeOptions={{ exact: page.to === '/' }}
      className={navLinkClass}
      data-open={flag(isPageOpen(pathname, page.to))}
      data-part="nav-link"
      data-pending={flag(isPagePending(pathname, pending, page.to))}
      to={page.to}
    >
      <span className="grid justify-items-center">
        <span className="col-start-1 row-start-1">{page.label}</span>
        {/* Keeps the link as wide as its bold form, so marking a page does not push its neighbours. */}
        <span
          aria-hidden={true}
          className="invisible col-start-1 row-start-1 font-bold"
        >
          {page.label}
        </span>
      </span>
    </Link>
  );
};

/**
 * The bar at the top of every page. On a phone it keeps only the name; the
 * pages and the actions move to the tab bar at the bottom.
 */
export const ShellTopBar = ({
  signOut,
}: {
  readonly signOut: ShellSignOut;
}) => {
  // While anything loads, the mark's ruler has not come to rest.
  const loading = useIsLoading();
  return (
    <header
      className="sticky top-0 z-20 border-ink border-b-[1.5px] bg-paper"
      data-part="top-bar"
    >
      <div className="mx-auto flex desk:h-16 h-13 max-w-[78rem] items-stretch desk:gap-4 gap-3 desk:px-6 px-4 min-[64rem]:gap-9">
        <Link
          aria-label="Punktlandung, zur Übersicht"
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap font-bold desk:text-[1.125rem] text-lg tracking-[-0.01em]"
          to="/"
        >
          <BrandMark motion={loading ? 'sways' : undefined} />
          Punktlandung
        </Link>
        <nav
          aria-label="Hauptnavigation"
          // Should the links ever need more room than there is, as with letter spacing a reader has widened, they scroll here instead of pushing the page sideways.
          className="desk:flex hidden min-w-0 flex-1 items-stretch gap-1 overflow-x-auto [scrollbar-width:none]"
        >
          {mainPages.map((page) => (
            <NavLink key={page.to} page={page} />
          ))}
          {/* A pen stroke between the pages of every day and the ones that set the app up. */}
          <span
            aria-hidden={true}
            className="mx-1.5 h-4 w-px shrink-0 self-center bg-line min-[64rem]:mx-2.5"
          />
          {setupPages.map((page) => (
            <NavLink key={page.to} page={page} />
          ))}
        </nav>
        <div className="desk:flex hidden shrink-0 items-center gap-2">
          <Link
            className={`${primaryButtonClass} max-[64rem]:hidden`}
            search={{ neu: true }}
            to="/noten"
          >
            <Plus
              aria-hidden={true}
              size={buttonIconSize}
              strokeWidth={iconStroke}
            />
            Note eintragen
          </Link>
          <Link
            aria-label="Note eintragen"
            className="inline-grid size-10 place-items-center bg-ink text-paper transition-[background-color,translate] duration-150 ease-standard hover:bg-ink/85 active:translate-y-px min-[64rem]:hidden"
            data-tip="Note eintragen"
            search={{ neu: true }}
            to="/noten"
          >
            <Plus aria-hidden={true} size={iconSize} strokeWidth={iconStroke} />
          </Link>
          <IconButton
            disabled={signOut.pending}
            icon={LogOut}
            label="Abmelden"
            onClick={signOut.run}
            pending={signOut.pending}
          />
        </div>
      </div>
    </header>
  );
};
