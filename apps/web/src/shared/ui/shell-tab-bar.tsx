import { Link, useLocation } from '@tanstack/react-router';
import { Ellipsis, LogOut, Plus } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { iconSize, iconStroke } from './icon.ts';
import { flag } from './ruler/disc-look.ts';
import {
  isPageOpen,
  isPagePending,
  mainPages,
  type ShellSignOut,
  setupPages,
  usePendingPathname,
  useShownPathname,
} from './shell-nav.ts';

/**
 * The disc above the tab you are on is drawn by `shell.css` on
 * `data-part="tab"`, and the strip of paper it stands in on
 * `data-part="tab-bar"`. The tab is marked by `data-open`, which changes with
 * the page that is drawn; see `useShownPathname`. A page that was asked for
 * and is not there yet is marked by `data-pending`: its disc is in the air.
 */
const tabClass =
  'relative grid min-h-15 content-center justify-items-center gap-0.5 px-0.5 py-1.5 text-2xs text-ink-soft transition-colors duration-150 ease-standard hover:text-ink focus-visible:-outline-offset-4 active:text-ink aria-expanded:text-ink data-open:font-bold data-open:text-ink';

const moreItemClass =
  'flex min-h-[2.875rem] items-center gap-3 px-3 text-left hover:bg-paper disabled:text-ink-soft aria-[current=page]:font-bold';

/** A label that may break, and is hyphenated, where enlarged text leaves the menu too narrow for it. */
const moreLabelClass = 'min-w-0 hyphens-auto break-words';

const Tab = ({ page }: { readonly page: (typeof mainPages)[number] }) => {
  const pathname = useShownPathname();
  const pending = usePendingPathname();
  return (
    <Link
      activeOptions={{ exact: page.to === '/' }}
      className={tabClass}
      data-open={flag(isPageOpen(pathname, page.to))}
      data-part="tab"
      data-pending={flag(isPagePending(pathname, pending, page.to))}
      to={page.to}
    >
      <page.icon aria-hidden={true} size={22} strokeWidth={iconStroke} />
      {page.label}
    </Link>
  );
};

/**
 * The last tab holds what is needed rarely: the pages that set the app up,
 * and signing out. It opens upwards, clear of the disc that marks the tab, and
 * closes on Escape, on a press beside it, and when a page is chosen.
 */
const MoreTab = ({ signOut }: { readonly signOut: ShellSignOut }) => {
  const pathname = useShownPathname();
  const pending = usePendingPathname();
  const href = useLocation({ select: (location) => location.href });
  // Remembering where it was opened closes it by itself once the page changes.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === href;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const controller = new AbortController();
    const options = { signal: controller.signal };
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          setOpenedAt(null);
          buttonRef.current?.focus();
        }
      },
      options,
    );
    document.addEventListener(
      'pointerdown',
      (event) => {
        const inside = [buttonRef.current, popoverRef.current].some(
          (element) =>
            event.target instanceof Node && element?.contains(event.target),
        );
        if (!inside) {
          setOpenedAt(null);
        }
      },
      options,
    );
    return () => controller.abort();
  }, [open]);

  /** The chosen link disappears with the popover, so the focus goes back to what opened it. */
  const choose = () => {
    setOpenedAt(null);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        aria-controls={open ? popoverId : undefined}
        aria-expanded={open}
        className={tabClass}
        data-open={flag(
          setupPages.some((page) => isPageOpen(pathname, page.to)),
        )}
        data-part="tab"
        data-pending={flag(
          setupPages.some((page) => isPagePending(pathname, pending, page.to)),
        )}
        onClick={() => setOpenedAt(open ? null : href)}
        ref={buttonRef}
        type="button"
      >
        <Ellipsis aria-hidden={true} size={22} strokeWidth={iconStroke} />
        Mehr
      </button>
      {open ? (
        <div
          // Above the strip of paper the bar lays over the page, which would wash out its lower edge. With enlarged text it may not grow wider than the screen, and its entries wrap instead.
          className="absolute right-2 bottom-[calc(100%+1.125rem)] z-10 grid w-max min-w-[min(13.125rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] animate-eases-in grid-cols-1 border-[1.5px] border-ink bg-sheet p-1.5 text-base"
          id={popoverId}
          ref={popoverRef}
        >
          {setupPages.map((page) => (
            <Link
              className={moreItemClass}
              key={page.to}
              onClick={choose}
              to={page.to}
            >
              <page.icon
                aria-hidden={true}
                size={iconSize}
                strokeWidth={iconStroke}
              />
              <span className={moreLabelClass}>{page.label}</span>
            </Link>
          ))}
          <button
            className={moreItemClass}
            disabled={signOut.pending}
            onClick={signOut.run}
            type="button"
          >
            <LogOut
              aria-hidden={true}
              size={iconSize}
              strokeWidth={iconStroke}
            />
            <span className={moreLabelClass}>
              {signOut.pending ? 'Wird abgemeldet …' : 'Abmelden'}
            </span>
          </button>
        </div>
      ) : null}
    </>
  );
};

/**
 * The navigation of a phone: the three pages of every day, entering a Note in
 * the middle where the thumb is, and the rest behind "Mehr".
 */
export const ShellTabBar = ({
  signOut,
}: {
  readonly signOut: ShellSignOut;
}) => {
  const [first, second, third] = mainPages;
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-30 grid desk:hidden grid-cols-5 items-stretch border-ink border-t-[1.5px] bg-paper pb-[env(safe-area-inset-bottom)]"
      data-part="tab-bar"
    >
      <Tab page={first} />
      <Tab page={second} />
      <Link
        aria-label="Note eintragen"
        className="grid h-11 w-13 place-items-center place-self-center bg-ink text-paper transition-[background-color,translate] duration-150 ease-standard hover:bg-ink/85 active:translate-y-px"
        search={{ neu: true }}
        to="/noten"
      >
        <Plus aria-hidden={true} size={26} strokeWidth={iconStroke} />
      </Link>
      <Tab page={third} />
      <MoreTab signOut={signOut} />
    </nav>
  );
};
