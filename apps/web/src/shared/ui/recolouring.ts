import { useEffect } from 'react';

/** A little longer than the colour tokens take to ease in theme.css, so the last frame is covered. */
const recolouringMs = 700;

/**
 * Marks the document for as long as the colour tokens ease after the system
 * scheme changed, so that nothing eases on its own meanwhile (theme.css). A
 * button or link with its own colour transition would otherwise start it
 * again on every frame, towards a colour that keeps moving, and stay behind
 * the page for the whole change: washed out, then catching up late.
 */
export const useRecolouring = (): void => {
  useEffect(() => {
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    let done: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      document.documentElement.toggleAttribute('data-recolouring', true);
      clearTimeout(done);
      done = setTimeout(
        () => document.documentElement.removeAttribute('data-recolouring'),
        recolouringMs,
      );
    };
    scheme.addEventListener('change', onChange);
    return () => {
      scheme.removeEventListener('change', onChange);
      clearTimeout(done);
    };
  }, []);
};
