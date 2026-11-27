import type { ReactNode } from 'react';

import { sheetClass } from './form-classes.ts';

/**
 * What a page shows while there is nothing to show yet: what is missing, in
 * one sentence, and the one action that changes it.
 */
export const EmptyState = ({
  children,
  text,
  title,
}: {
  /** The action, such as a link styled as a button. */
  readonly children?: ReactNode;
  readonly text: ReactNode;
  readonly title: string;
}) => (
  <div className={`${sheetClass} desk:p-8 p-5`}>
    <h2 className="font-bold text-xl">{title}</h2>
    <p className="mt-2 max-w-[60ch] text-ink-soft">{text}</p>
    {children === undefined ? null : <div className="mt-5">{children}</div>}
  </div>
);
