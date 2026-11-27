import { useEffect, useRef } from 'react';

/** Distance kept between the tooltip and the edge of the window. */
const edgeGap = 8;
/** Distance between the tooltip and what it names. */
const targetGap = 9;
/** The arrow stays this far from the tooltip's own corners. */
const arrowInset = 12;
/**
 * A button is named once the pointer has rested on it for this long, so
 * crossing a row of them on the way elsewhere does not flash their names. A
 * disc is named at once: reading the discs is what a figure is for.
 */
const restMs = 350;
/** After a name was shown, the next button names itself at once for this long. */
const warmMs = 400;

const place = (tip: HTMLElement, target: Element) => {
  const box = target.getBoundingClientRect();
  const own = tip.getBoundingClientRect();
  const centre = box.left + box.width / 2;
  const left = Math.max(
    edgeGap,
    Math.min(innerWidth - own.width - edgeGap, centre - own.width / 2),
  );
  const above = box.top - own.height - targetGap;
  const below = above < edgeGap;
  tip.style.left = `${left}px`;
  tip.style.top = `${below ? box.bottom + targetGap : above}px`;
  tip.style.setProperty(
    '--arrow',
    `${Math.max(arrowInset, Math.min(own.width - arrowInset, centre - left))}px`,
  );
  tip.toggleAttribute('data-below', below);
};

const tipTarget = (event: Event): Element | null =>
  event.target instanceof Element ? event.target.closest('[data-tip]') : null;

/**
 * The one tooltip of the app. It names whatever carries `data-tip` when the
 * pointer or the keyboard focus rests on it: an icon button, a disc on the
 * ruler. Every such element also has its accessible name, so the tooltip is
 * hidden from screen readers. Touch screens have no hover and get none.
 */
export const TooltipLayer = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tip = ref.current;
    if (tip === null) {
      return;
    }
    let resting: ReturnType<typeof setTimeout> | undefined;
    let hiddenAt = Number.NEGATIVE_INFINITY;
    const hide = () => {
      clearTimeout(resting);
      if (!tip.hidden) {
        hiddenAt = performance.now();
      }
      tip.hidden = true;
    };
    const show = (target: Element | null) => {
      clearTimeout(resting);
      const text = target?.getAttribute('data-tip');
      if (!(target && text) || matchMedia('(hover: none)').matches) {
        hide();
        return;
      }
      tip.textContent = text;
      tip.hidden = false;
      place(tip, target);
    };
    const onPointerOver = (event: Event) => {
      const target = tipTarget(event);
      const rests =
        target?.matches('a, button') === true &&
        tip.hidden &&
        performance.now() - hiddenAt > warmMs;
      if (rests) {
        clearTimeout(resting);
        resting = setTimeout(() => show(target), restMs);
        return;
      }
      show(target);
    };
    const onFocusIn = (event: Event) => {
      // A disc on the ruler carries the text on its group and takes focus on the link inside it.
      if (
        event.target instanceof Element &&
        event.target.matches(':focus-visible')
      ) {
        show(tipTarget(event));
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hide();
      }
    };
    const controller = new AbortController();
    const options = { passive: true, signal: controller.signal };
    document.addEventListener('pointerover', onPointerOver, options);
    document.addEventListener('pointerdown', hide, options);
    document.addEventListener('focusin', onFocusIn, options);
    document.addEventListener('focusout', hide, options);
    document.addEventListener('keydown', onKeyDown, options);
    addEventListener('scroll', hide, { ...options, capture: true });
    return () => {
      clearTimeout(resting);
      controller.abort();
    };
  }, []);

  return (
    <div
      aria-hidden={true}
      className="pointer-events-none fixed z-60 max-w-[300px] bg-ink px-2.5 py-1.5 text-paper text-sm leading-[1.35] after:absolute after:-bottom-[5px] after:left-[var(--arrow,50%)] after:-ml-[5px] after:border-[5px] after:border-transparent after:border-t-ink after:border-b-0 after:content-[''] data-below:after:-top-[5px] data-below:after:bottom-auto data-below:after:border-t-0 data-below:after:border-b-[5px] data-below:after:border-b-ink"
      hidden={true}
      ref={ref}
    />
  );
};
