import { Link } from '@tanstack/react-router';
import type { ComponentType, ReactNode } from 'react';

export type LeistungLinkProps = {
  readonly id: string;
  readonly children: ReactNode;
  readonly className?: string;
  /** The accessible name, where the content has none of its own, as on a disc. */
  readonly label?: string;
  readonly onBlur?: () => void;
  readonly onFocus?: () => void;
};

/** How a Leistung is linked to its page. Handed in, so rows and benches render without a router. */
export type LeistungLinkComponent = ComponentType<LeistungLinkProps>;

/** The link to the page of a Leistung. It carries the id, so the saved row can be found again. */
export const LeistungLink = ({
  children,
  className,
  id,
  label,
  onBlur,
  onFocus,
}: LeistungLinkProps) => (
  <Link
    aria-label={label}
    className={className}
    data-leistung-link={id}
    onBlur={onBlur}
    onFocus={onFocus}
    params={{ id }}
    to="/noten/$id"
  >
    {children}
  </Link>
);
