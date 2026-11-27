import { type PointerEvent, useRef } from 'react';

/** How far a finger moves before it is clear whether it drags along the bar or scrolls the page. */
const touchSlop = 6;

/** A pointer on the bar. A finger has not said at once whether it drags, scrolls the page or taps. */
type Drag = {
  readonly x: number;
  readonly y: number;
  state: 'undecided' | 'dragging' | 'scrolling';
};

/**
 * Follows a pointer along a bar that the page scrolls past: its host carries
 * `touch-pan-y`. A mouse drags from the moment it is pressed. A finger may be
 * about to scroll the page, so it counts only once it has moved along the
 * bar, or when it is lifted where it was put down.
 */
export const useScrubbing = <Host extends Element>(
  scrub: (event: PointerEvent<Host>) => void,
) => {
  const dragRef = useRef<Drag | null>(null);
  return {
    onPointerCancel: (): void => {
      dragRef.current = null;
    },
    onPointerDown: (event: PointerEvent<Host>): void => {
      event.currentTarget.setPointerCapture(event.pointerId);
      const touch = event.pointerType === 'touch';
      dragRef.current = {
        x: event.clientX,
        y: event.clientY,
        state: touch ? 'undecided' : 'dragging',
      };
      if (!touch) {
        scrub(event);
      }
    },
    onPointerMove: (event: PointerEvent<Host>): void => {
      const drag = dragRef.current;
      if (drag === null) {
        return;
      }
      if (drag.state === 'undecided') {
        const along = Math.abs(event.clientX - drag.x);
        const across = Math.abs(event.clientY - drag.y);
        if (across >= touchSlop && across > along) {
          drag.state = 'scrolling';
        } else if (along >= touchSlop) {
          drag.state = 'dragging';
        }
      }
      if (drag.state === 'dragging') {
        scrub(event);
      }
    },
    onPointerUp: (event: PointerEvent<Host>): void => {
      if (dragRef.current?.state === 'undecided') {
        scrub(event);
      }
      dragRef.current = null;
    },
  };
};
