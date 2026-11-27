import type { ReactNode, Ref } from 'react';

/**
 * The head of a page: its name, one line that says what is shown, and beside
 * them the control that changes what is shown, such as the Halbjahr.
 */
export const PageHeader = ({
  children,
  headingRef,
  lead,
  title,
}: {
  /** Controls that stand at the right end of the head. */
  readonly children?: ReactNode;
  /**
   * Makes the heading a target for the keyboard focus, for a page that moves
   * the focus there when the control that had it goes away.
   */
  readonly headingRef?: Ref<HTMLHeadingElement>;
  readonly lead?: ReactNode;
  readonly title: string;
}) => (
  <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5 desk:pt-[2.125rem] pt-[1.375rem] desk:pb-[1.625rem] pb-[1.125rem]">
    <div className="min-w-0">
      <h1
        className="font-bold text-3xl tracking-[-0.015em] focus-visible:outline-none"
        ref={headingRef}
        tabIndex={headingRef === undefined ? undefined : -1}
      >
        {title}
      </h1>
      {lead === undefined ? null : (
        <p className="mt-2 desk:text-ui text-ink-soft text-sm">{lead}</p>
      )}
    </div>
    {children}
  </header>
);

/** The head of a section inside a page, with an optional remark at its right end. */
export const SectionHeader = ({
  children,
  title,
}: {
  readonly children?: ReactNode;
  readonly title: string;
}) => (
  <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
    <h2 className="font-bold text-xl">{title}</h2>
    {children === undefined ? null : (
      <p className="text-ink-soft text-sm">{children}</p>
    )}
  </div>
);
