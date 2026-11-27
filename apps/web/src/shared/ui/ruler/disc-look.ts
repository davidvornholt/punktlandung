import type { DiscKind, DiscState } from './geometry.ts';

/** The values of `data-look`, which ruler.css draws a disc by. */
export type DiscLook = 's' | 'm' | 'fach' | 'pending' | 'missing';

/** A disc is drawn by what it is, and while it has no Note by why not. */
export const discLook = (kind: DiscKind, state: DiscState): DiscLook => {
  if (state === 'missing') {
    return 'missing';
  }
  if (state === 'pending') {
    return 'pending';
  }
  if (kind === 'fach') {
    return 'fach';
  }
  return kind === 'muendlich' ? 'm' : 's';
};

/** A data attribute that is either present or absent. */
export const flag = (on: boolean | undefined): '' | undefined =>
  on ? '' : undefined;
