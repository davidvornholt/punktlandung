import type { LucideIcon } from 'lucide-react';
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps } from 'react';

import { iconButtonClass, iconSize, iconStroke } from './icon.ts';

/**
 * Ein quadratischer Knopf, der nur ein Symbol zeigt. Der Name steht im
 * `aria-label` und erscheint als Hinweis beim Verweilen; Text gibt es hier
 * nicht, damit Zeilen mit drei Aktionen nicht zu Sätzen werden.
 */
export const IconButton = ({
  className,
  icon: Icon,
  label,
  pending = false,
  ...rest
}: Omit<
  ComponentProps<'button'>,
  'aria-label' | 'children' | 'title' | 'type'
> & {
  readonly icon: LucideIcon;
  /** Zugänglicher Name; wird auch als Hinweis beim Verweilen gezeigt. */
  readonly label: string;
  /** Zeigt statt des Symbols einen Kreisel und meldet den Vorgang. */
  readonly pending?: boolean;
}) => (
  <button
    {...rest}
    aria-busy={pending || undefined}
    aria-label={label}
    className={`${iconButtonClass} ${className ?? ''}`}
    title={label}
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
