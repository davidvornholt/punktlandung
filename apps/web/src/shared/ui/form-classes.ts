/**
 * Recurring classes of forms and controls. Semantic token utilities only. A
 * control is drawn with the pen: a 1.5px ink line, barely eased corners, and
 * ink that fills the one action a form is there for.
 */

export const labelClass = 'block text-ink-soft text-sm';

/** A hint under a field or a figure. */
export const hintClass = 'text-ink-soft text-sm';

const inputLook =
  'min-h-[2.625rem] border-[1.5px] border-ink bg-paper px-3 text-ink placeholder:text-ink-soft disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-critical';

/** A field under its label, as wide as its column. */
export const inputClass = `mt-1.5 block w-full ${inputLook}`;

/** A field that stands in a line with other things and is as wide as what it holds. */
export const inlineInputClass = inputLook;

/*
 * A button is built from parts that never set the same property, so no part
 * has to win over another: the order of classes in the markup does not decide
 * which of two conflicting utilities applies. For the same reason a call site
 * adds only what places the button (margins, grid cells, visibility), never
 * padding, height, weight, size or colour; what recurs becomes a look or a
 * size here.
 */
const buttonShape =
  'inline-flex items-center justify-center gap-2 border-[1.5px] whitespace-nowrap transition-[background-color,border-color,color,translate] duration-150 ease-standard not-disabled:not-aria-disabled:active:translate-y-px disabled:cursor-default disabled:opacity-45 aria-disabled:cursor-default aria-disabled:opacity-45';

/* A button that is disabled does not answer the pointer, so every hover is guarded. */
const buttonLooks = {
  /** The one action a form or a page is there for. */
  primary:
    'border-ink bg-ink font-bold text-paper not-disabled:not-aria-disabled:hover:bg-ink/85',
  secondary:
    'border-ink font-bold text-ink not-disabled:not-aria-disabled:hover:bg-sheet',
  /** Stands beside a stronger action: no line until it is pointed at. */
  quiet:
    'border-transparent font-bold text-ink not-disabled:not-aria-disabled:hover:border-line',
  /** An action under a sentence, in the weight of the text around it. */
  plain:
    'border-transparent text-ink not-disabled:not-aria-disabled:hover:border-line',
  /** Removes something for good. */
  danger:
    'border-critical font-bold text-critical not-disabled:not-aria-disabled:hover:bg-critical-soft',
} as const;

const buttonSizes = {
  regular: 'min-h-10 py-2 text-ui',
  /** For the head of a section and for answers inside a row. */
  compact: 'min-h-9 py-1.5 text-sm',
} as const;

const buttonWidths = { regular: 'px-4', compact: 'px-3' } as const;

/** A button without a line of its own has nothing to keep its text away from, so it is narrower. */
const lineLessWidth = 'px-2.5';

export type ButtonLook = keyof typeof buttonLooks;
export type ButtonSize = keyof typeof buttonSizes;

export const buttonClass = (
  look: ButtonLook,
  size: ButtonSize = 'regular',
): string => {
  const width =
    look === 'quiet' || look === 'plain' ? lineLessWidth : buttonWidths[size];
  return `${buttonShape} ${buttonSizes[size]} ${width} ${buttonLooks[look]}`;
};

export const primaryButtonClass = buttonClass('primary');

export const secondaryButtonClass = buttonClass('secondary');

export const quietButtonClass = buttonClass('quiet');

/** A text link inside a sentence. */
export const linkClass =
  'underline decoration-1 underline-offset-[3px] hover:decoration-2';

const errorLook = 'border-[1.5px] border-critical bg-critical-soft text-ink';

/** A message that something failed, beside the field or the row it is about. */
export const errorBoxClass = `${errorLook} px-3 py-2`;

/** A message that a page or a list could not be loaded, with the way to try again inside it. */
export const errorPanelClass = `${errorLook} p-4`;

/** A panel that lies on the paper: the entry form, a chooser, an empty state. */
export const sheetClass = 'border-[1.5px] border-ink bg-sheet';
