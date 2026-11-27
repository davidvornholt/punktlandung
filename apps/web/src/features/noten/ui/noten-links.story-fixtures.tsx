import type { LeistungLinkComponent } from './noten-links.tsx';

/**
 * Stands in for the link to a Leistung where there is no router, in stories
 * and unit tests. It leads nowhere, and carries what the list finds a row by.
 */
export const PlainLeistungLink: LeistungLinkComponent = ({
  children,
  className,
  id,
  label,
  onBlur,
  onFocus,
}) => (
  <a
    aria-label={label}
    className={className}
    data-leistung-link={id}
    href={`#leistung-${id}`}
    onBlur={onBlur}
    onFocus={onFocus}
  >
    {children}
  </a>
);
