/**
 * A square button or link that shows only an icon. One that has opened
 * something (`aria-expanded`) keeps an ink line for as long as it is open.
 * What answers a finger reaches 2px past the square on every side, so the
 * target is the 44px a thumb needs while the row stays as low as it is.
 */
export const iconButtonClass =
  'relative inline-grid size-10 shrink-0 place-items-center after:absolute after:-inset-0.5 border-[1.5px] border-transparent text-ink-soft transition-colors duration-150 ease-standard not-disabled:not-aria-expanded:hover:border-line not-disabled:hover:text-ink disabled:cursor-default disabled:opacity-45 aria-expanded:border-ink aria-expanded:text-ink';

/** Size and stroke of every Lucide icon in the app. */
export const iconSize = 18;

/** An icon inside a button with text. */
export const buttonIconSize = 16;

export const iconStroke = 2;
