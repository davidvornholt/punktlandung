import { prefersReducedMotion } from '#/shared/ui/motion.ts';

/**
 * Where the Noten page puts the keyboard and the view. Everything is found
 * inside the list by a data attribute, so nothing here holds on to an element
 * that a refresh has replaced.
 */

type Region = HTMLElement | null;

const find = (region: Region, selector: string): HTMLElement | null =>
  region?.querySelector<HTMLElement>(selector) ?? null;

const named = (attribute: string, value: string): string =>
  `[${attribute}="${CSS.escape(value)}"]`;

const fachSection = (region: Region, fachId: string): HTMLElement | null =>
  find(region, named('data-fach', fachId));

const pixels = (length: string): number => Number.parseFloat(length) || 0;

/** How much of the top of the screen the sticky bars cover above this element. */
const coveredAbove = (element: HTMLElement): number =>
  pixels(getComputedStyle(document.documentElement).scrollPaddingTop) +
  pixels(getComputedStyle(element).scrollMarginTop);

const scrollToStart = (element: HTMLElement, glide = true): void =>
  element.scrollIntoView({
    block: 'start',
    behavior: glide && !prefersReducedMotion() ? 'smooth' : 'auto',
  });

/** Scrolls only when a part is out of sight; what is in view already stays where it is. */
const reveal = (element: HTMLElement | null): void => {
  if (element === null) {
    return;
  }
  const { top, bottom } = element.getBoundingClientRect();
  if (top < coveredAbove(element) || bottom > window.innerHeight) {
    scrollToStart(element);
  }
};

export const revealFach = (region: Region, fachId: string): void =>
  reveal(fachSection(region, fachId));

const fachHeading = (region: Region, fachId: string): HTMLElement | null =>
  find(region, `${named('data-fach', fachId)} [data-fach-heading]`);

/**
 * Goes to a Fach of the page: its section moves to the top and its heading
 * takes the keyboard. Whoever arrives on the page at a Fach is put there at
 * once; a ride down the page is for a jump within it.
 */
export const jumpToFach = (
  region: Region,
  fachId: string,
  { arriving = false }: { readonly arriving?: boolean } = {},
): void => {
  const section = fachSection(region, fachId);
  if (section === null) {
    return;
  }
  scrollToStart(section, !arriving);
  fachHeading(region, fachId)?.focus({ preventScroll: true });
};

/**
 * Runs once the page is laid out. A bar draws itself one step after it is
 * mounted, when it knows its width, and until then every Fach above is
 * shorter than it will be: a place measured before that is the wrong one.
 */
export const whenLaidOut = (run: () => void): (() => void) => {
  const frame = requestAnimationFrame(run);
  return () => cancelAnimationFrame(frame);
};

/** The button of a Fach that opens a new Note in it; closing the entry returns the keyboard to it. */
export const addButton = (region: Region, fachId: string): HTMLElement | null =>
  find(region, named('data-add-note', fachId));

/** The choice of a Fach comes into view and takes the keyboard. */
export const focusChooser = (region: Region): void => {
  reveal(find(region, '[data-chooser]'));
  find(region, '[data-chooser] li button')?.focus({ preventScroll: true });
};

/** The row of a Leistung in the list of its Fach; the disc on the bar carries the same link. */
export const focusRow = (region: Region, id: string): void =>
  find(region, `li ${named('data-leistung-link', id)}`)?.focus();

/**
 * A deleted row takes the button that deleted it along. The keyboard goes to
 * the heading of its Fach, or to the list where the Fach went with its last
 * Note. Whoever has moved on in the meantime keeps their place.
 */
export const focusAfterDelete = (
  region: Region,
  { fachId, id }: { readonly fachId: string | null; readonly id: string },
): void => {
  const active = document.activeElement;
  const row = find(region, named('data-row', id));
  if (active !== document.body && !(row?.contains(active) ?? false)) {
    return;
  }
  const heading = fachId === null ? null : fachHeading(region, fachId);
  (heading ?? region)?.focus({ preventScroll: true });
};
