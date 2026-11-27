import { useRouterState } from '@tanstack/react-router';
import {
  BookOpen,
  List,
  type LucideIcon,
  Scale,
  ScrollText,
  Settings,
} from 'lucide-react';

type ShellPage = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly to: string;
};

/** The pages of every day: first in the top bar, and the tabs of a phone. */
export const mainPages = [
  { to: '/', label: 'Übersicht', icon: Scale },
  { to: '/noten', label: 'Noten', icon: List },
  { to: '/zeugnis', label: 'Zeugnis', icon: ScrollText },
] as const satisfies ReadonlyArray<ShellPage>;

/** The pages that set the app up. The top bar sets them apart; a phone keeps them behind "Mehr". */
export const setupPages = [
  { to: '/faecher', label: 'Fächer', icon: BookOpen },
  { to: '/einstellungen', label: 'Einstellungen', icon: Settings },
] as const satisfies ReadonlyArray<ShellPage>;

/** Whether `pathname` is the page at `to` or lies under it, as a Leistung lies under Noten. */
export const isPageOpen = (pathname: string, to: string): boolean =>
  to === '/'
    ? pathname === '/'
    : pathname === to || pathname.startsWith(`${to}/`);

/**
 * The address of the page that is drawn. The router's own location, and with
 * it the `aria-current` of a link, changes as soon as a page is asked for,
 * which is before the change of page is animated. A mark that followed it
 * would already be on the next page in the picture of the old one, so the
 * disc could not travel from one to the other. This address changes together
 * with the page.
 */
export const useShownPathname = (): string =>
  useRouterState({
    select: (state) => (state.resolvedLocation ?? state.location).pathname,
  });

/**
 * The address of a page that has been asked for and is not drawn yet, or
 * `null`. On a slow connection that takes seconds, during which the old page
 * stays, so the bars show meanwhile where the way leads.
 */
export const usePendingPathname = (): string | null =>
  useRouterState({
    select: (state) => {
      const shown = (state.resolvedLocation ?? state.location).pathname;
      return state.isLoading && state.location.pathname !== shown
        ? state.location.pathname
        : null;
    },
  });

/** Whether the page at `to` is on its way and is not the one that is drawn. */
export const isPagePending = (
  shown: string,
  pending: string | null,
  to: string,
): boolean =>
  pending !== null && isPageOpen(pending, to) && !isPageOpen(shown, to);

/** Whether the router is loading anything: a page, or a page's data again. */
export const useIsLoading = (): boolean =>
  useRouterState({ select: (state) => state.isLoading });

/** The id of the page's main element, which the skip link points at. */
export const mainId = 'inhalt';

/** Signing out, as the shell's bars need it: they start it and show how it goes. */
export type ShellSignOut = {
  readonly failed: boolean;
  readonly pending: boolean;
  readonly run: () => void;
};
