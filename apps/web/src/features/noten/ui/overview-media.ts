import { useSyncExternalStore } from 'react';

/** The app's one breakpoint, as in the theme: below it the app is laid out for a phone. */
const deskQuery = '(min-width: 51.3125rem)';

const subscribe = (onChange: () => void): (() => void) => {
  const media = matchMedia(deskQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

/**
 * Whether the wide layout applies. For figures whose measures are worked out
 * in code and differ between the two layouts; everything else uses `desk:`.
 */
export const useIsDesk = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => matchMedia(deskQuery).matches,
    () => true,
  );
