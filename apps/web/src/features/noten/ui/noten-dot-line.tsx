/**
 * A line of parts joined by dots, as under a heading or in a row. Where it is
 * too long for its place it breaks between two parts and never inside one,
 * and the dot stays with the part before it. A part that is longer than the
 * whole line still breaks inside.
 */
export const DotLine = ({
  parts,
}: {
  /** No two parts of a line are the same: each says something else. */
  readonly parts: ReadonlyArray<string>;
}) =>
  parts.flatMap((part, index) => [
    // The plain space between two parts is where the line may break.
    index === 0 ? '' : ' ',
    <span className="inline-block" key={part}>
      {part}
      {index === parts.length - 1 ? '' : ' ·'}
    </span>,
  ]);
