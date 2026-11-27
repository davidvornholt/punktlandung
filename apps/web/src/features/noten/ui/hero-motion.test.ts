import { describe, expect, it } from 'bun:test';
import { playIndex } from './hero-motion.ts';

describe('playIndex', () => {
  it('lässt erst die älteren Halbjahre landen und dann Note für Note die des laufenden', () => {
    expect(playIndex(-100, 120, 130)).toBe(0);
    expect(playIndex(0, 120, 130)).toBe(0);
    expect(playIndex(950, 120, 130)).toBeGreaterThan(55);
    expect(playIndex(950, 120, 130)).toBeLessThan(70);
    expect(playIndex(1899, 120, 130)).toBe(119);
    expect(playIndex(1900, 120, 130)).toBe(121);
    expect(playIndex(1900 + 105 * 4, 120, 130)).toBe(125);
    expect(playIndex(1900 + 105 * 9, 120, 130)).toBe(130);
    expect(playIndex(60_000, 120, 130)).toBe(130);
  });

  it('nimmt nie eine Note zurück', () => {
    const counts = Array.from({ length: 400 }, (_, frame) =>
      playIndex(frame * 16, 120, 130),
    );
    expect(counts).toEqual([...counts].sort((left, right) => left - right));
  });

  it('wartet nicht, wenn es nur das laufende Halbjahr gibt', () => {
    expect(playIndex(0, 0, 6)).toBe(1);
    expect(playIndex(105 * 5, 0, 6)).toBe(6);
  });

  it('braucht für ein volles laufendes Halbjahr nicht länger als gut zwei Sekunden', () => {
    expect(playIndex(1900 + 2200, 120, 200)).toBe(200);
    expect(playIndex(1900 + 1100, 120, 200)).toBe(161);
  });
});
