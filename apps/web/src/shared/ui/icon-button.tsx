import type { LucideIcon } from 'lucide-react';
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';

import { iconButtonClass, iconSize, iconStroke } from './icon.ts';

/**
 * A square button that shows only an icon. Its name is the `aria-label` and
 * appears as a tooltip; there is no text, so a row with two actions does not
 * turn into a sentence.
 */
export const IconButton = ({
  className,
  icon: Icon,
  label,
  pending = false,
  tip = label,
  ...rest
}: Omit<
  ComponentProps<'button'>,
  'aria-label' | 'children' | 'title' | 'type'
> & {
  readonly icon: LucideIcon;
  /** Accessible name. */
  readonly label: string;
  /** Shows a spinner instead of the icon and reports the action as busy. */
  readonly pending?: boolean;
  /** Tooltip text where the accessible name is longer than a tooltip should be. */
  readonly tip?: string;
}) => (
  <button
    {...rest}
    aria-busy={pending || undefined}
    aria-label={label}
    className={`${iconButtonClass} ${className ?? ''}`}
    data-tip={tip}
    type="button"
  >
    {pending ? (
      <LoaderCircle
        aria-hidden={true}
        className="animate-spin"
        size={iconSize}
        strokeWidth={iconStroke}
      />
    ) : (
      <Icon aria-hidden={true} size={iconSize} strokeWidth={iconStroke} />
    )}
  </button>
);
