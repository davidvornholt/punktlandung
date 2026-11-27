import { useEffect, useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from '../motion.ts';

/**
 * The fulcrum follows the Schnitt on a spring, and the bar leans toward the
 * side that is heavier until the fulcrum has arrived under the centre of
 * mass. Positions are in units of the bar, tilt is in degrees.
 */

export type BalanceConfig = {
  /** Degrees the bar leans per unit the fulcrum still has to travel. */
  readonly gain: number;
  readonly maxTilt: number;
  readonly stiffness: number;
};

export const balanceConfigs = {
  row: { gain: 2.6, maxTilt: 3.2, stiffness: 46 },
  bench: { gain: 2.2, maxTilt: 2.6, stiffness: 46 },
  /** The Gesamtschnitt moves in small steps, so its bar is more sensitive and quicker. */
  hero: { gain: 5, maxTilt: 1.5, stiffness: 70 },
} as const satisfies Record<string, BalanceConfig>;

export type BalanceState = {
  readonly pos: number;
  readonly vel: number;
  readonly tilt: number;
  readonly tiltVel: number;
};

const spring = {
  tiltStiffness: 150,
  tiltDamping: 0.62,
  /** Two small steps per frame keep the springs stable. */
  substeps: 2,
  maxFrame: 0.032,
} as const;

const rest = {
  pos: 0.002,
  vel: 0.01,
  tilt: 0.01,
  tiltVel: 0.05,
} as const;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** Advances both springs by `dt` seconds toward `target`. */
export const stepBalance = (
  state: BalanceState,
  target: number,
  dt: number,
  config: BalanceConfig,
): BalanceState => {
  let { pos, vel, tilt, tiltVel } = state;
  const h = Math.min(spring.maxFrame, dt) / spring.substeps;
  for (let index = 0; index < spring.substeps; index += 1) {
    // Critically damped: the fulcrum arrives without swinging past.
    const accel =
      config.stiffness * (target - pos) - 2 * Math.sqrt(config.stiffness) * vel;
    vel += accel * h;
    pos += vel * h;
    const lean = clamp(
      config.gain * (target - pos),
      -config.maxTilt,
      config.maxTilt,
    );
    const tiltAccel =
      spring.tiltStiffness * (lean - tilt) -
      2 * spring.tiltDamping * Math.sqrt(spring.tiltStiffness) * tiltVel;
    tiltVel += tiltAccel * h;
    tilt += tiltVel * h;
  }
  return { pos, vel, tilt, tiltVel };
};

export const isResting = (state: BalanceState, target: number): boolean =>
  Math.abs(target - state.pos) < rest.pos &&
  Math.abs(state.vel) < rest.vel &&
  Math.abs(state.tilt) < rest.tilt &&
  Math.abs(state.tiltVel) < rest.tiltVel;

/** Draws one frame: where the fulcrum stands, how far the bar leans, and whether both have come to rest. */
export type BalancePaint = (
  pos: number | null,
  tilt: number,
  resting: boolean,
) => void;

export type Balance = {
  /**
   * Sends the fulcrum to `target`. `immediate` places it without motion;
   * `delay` waits, so the bar leans only once a falling disc has touched down.
   */
  readonly set: (
    target: number | null,
    options?: { readonly immediate?: boolean; readonly delay?: number },
  ) => void;
  /** Draws the current state again, after the figure changed its size. */
  readonly repaint: () => void;
  readonly stop: () => void;
};

const millisecondsPerSecond = 1000;

export const createBalance = (
  config: BalanceConfig,
  paint: BalancePaint,
): Balance => {
  let state: BalanceState | null = null;
  let target: number | null = null;
  let frame = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = 0;

  const stop = (): void => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    frame = 0;
    timer = undefined;
  };

  const step = (now: number): void => {
    if (state === null || target === null) {
      frame = 0;
      return;
    }
    state = stepBalance(
      state,
      target,
      (now - last) / millisecondsPerSecond,
      config,
    );
    last = now;
    if (isResting(state, target)) {
      state = { pos: target, vel: 0, tilt: 0, tiltVel: 0 };
      frame = 0;
      paint(target, 0, true);
      return;
    }
    paint(state.pos, state.tilt, false);
    frame = requestAnimationFrame(step);
  };

  const run = (): void => {
    timer = undefined;
    if (frame === 0) {
      last = performance.now();
      frame = requestAnimationFrame(step);
    }
  };

  return {
    set: (next, { immediate = false, delay = 0 } = {}) => {
      target = next;
      if (next === null) {
        stop();
        state = null;
        paint(null, 0, true);
        return;
      }
      if (immediate || state === null || prefersReducedMotion()) {
        stop();
        state = { pos: next, vel: 0, tilt: 0, tiltVel: 0 };
        paint(next, 0, true);
        return;
      }
      clearTimeout(timer);
      if (delay > 0) {
        timer = setTimeout(run, delay);
        return;
      }
      run();
    },
    repaint: () => {
      if (state === null) {
        paint(null, 0, true);
        return;
      }
      paint(state.pos, state.tilt, frame === 0 && timer === undefined);
    },
    stop,
  };
};

/**
 * One balance for the lifetime of a component. `paint` may change between
 * renders; the balance always calls the latest one.
 */
export const useBalance = (
  config: BalanceConfig,
  paint: BalancePaint,
): Balance => {
  const paintRef = useRef(paint);
  const balanceRef = useRef<Balance | null>(null);
  // Before the browser paints, so a frame drawn right after a change of width
  // already uses the new geometry and the fulcrum does not stay where it was.
  useLayoutEffect(() => {
    paintRef.current = paint;
  });
  balanceRef.current ??= createBalance(config, (...frame) =>
    paintRef.current(...frame),
  );
  const balance = balanceRef.current;
  useEffect(() => balance.stop, [balance]);
  return balance;
};
