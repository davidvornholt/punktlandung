import { useEffect, useRef } from 'react';

/**
 * Escape gives up what is open for entering a Note: the entry on a bench or
 * the choice of a Fach. Their parts carry `data-note-entry`; the key counts
 * when the focus is in one of them or nowhere, and not when something inside
 * has used it itself, such as the calendar of the date field.
 */
export const useEntryEscape = (active: boolean, onEscape: () => void): void => {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });
  useEffect(() => {
    if (!active) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      const from = event.target;
      const ours =
        from === document.body ||
        (from instanceof Element && from.closest('[data-note-entry]') !== null);
      if (event.key === 'Escape' && ours && !event.defaultPrevented) {
        onEscapeRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
};
