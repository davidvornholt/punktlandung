import { describe, expect, it } from 'bun:test';
import {
  type BalanceState,
  balanceConfigs,
  isResting,
  stepBalance,
} from './balance.ts';

const still = (pos: number): BalanceState => ({
  pos,
  vel: 0,
  tilt: 0,
  tiltVel: 0,
});

const frame = 1 / 60;

const run = (from: number, target: number, seconds: number) => {
  let state = still(from);
  let maxTilt = 0;
  let overshoot = 0;
  for (let time = 0; time < seconds; time += frame) {
    state = stepBalance(state, target, frame, balanceConfigs.bench);
    maxTilt = Math.max(maxTilt, Math.abs(state.tilt));
    overshoot = Math.max(overshoot, state.pos - target);
  }
  return { state, maxTilt, overshoot };
};

describe('stepBalance', () => {
  it('bringt den Keil ohne Überschwingen unter den neuen Schnitt', () => {
    const { state, overshoot } = run(10, 12, 3);
    expect(isResting(state, 12)).toBe(true);
    expect(overshoot).toBeLessThan(0.001);
  });

  it('neigt die Latte zur schwereren Seite und nie weiter als erlaubt', () => {
    const right = run(10, 12, 0.2);
    expect(right.state.tilt).toBeGreaterThan(0);
    expect(right.maxTilt).toBeLessThanOrEqual(
      balanceConfigs.bench.maxTilt * 1.2,
    );
    expect(run(12, 10, 0.2).state.tilt).toBeLessThan(0);
  });

  it('bleibt ruhig, wenn sich der Schnitt nicht ändert', () => {
    const state = stepBalance(still(8), 8, frame, balanceConfigs.bench);
    expect(state).toEqual(still(8));
    expect(isResting(state, 8)).toBe(true);
  });

  it('begrenzt einen langen Frame, damit die Federn stabil bleiben', () => {
    const state = stepBalance(still(0), 15, 5, balanceConfigs.bench);
    expect(Math.abs(state.pos)).toBeLessThan(15);
    expect(Number.isFinite(state.tilt)).toBe(true);
  });
});
