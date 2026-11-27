import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { buttonIconSize, iconStroke } from './icon.ts';

/**
 * What needs attention is marked the way a Heft marks it: with the yellow
 * marker. The icon keeps the mark readable without its colour.
 */
export const Flag = ({ children }: { readonly children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap bg-ruler py-px pr-[7px] pl-[5px] font-bold text-ruler-ink">
    <CircleAlert
      aria-hidden={true}
      size={buttonIconSize}
      strokeWidth={iconStroke}
    />
    {children}
  </span>
);
