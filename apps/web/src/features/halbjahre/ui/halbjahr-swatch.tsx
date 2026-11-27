import type { HalbjahrLook } from './halbjahr-look.ts';

const lookClass = {
  current: 'border-edge bg-note',
  future: 'border-ink border-dashed bg-paper',
  stratum0: 'border-stratum-edge bg-stratum-0',
  stratum1: 'border-stratum-edge bg-stratum-1',
  stratum2: 'border-stratum-edge bg-stratum-2',
  stratum3: 'border-stratum-edge bg-stratum-3',
} as const satisfies Record<HalbjahrLook, string>;

/**
 * The colour a Halbjahr has on the time line, beside its name in the list:
 * the row is the legend of the figure above it.
 */
export const HalbjahrSwatch = ({ look }: { readonly look: HalbjahrLook }) => (
  <span
    aria-hidden={true}
    className={`block size-[0.6875rem] shrink-0 rounded-full border ${lookClass[look]}`}
  />
);
