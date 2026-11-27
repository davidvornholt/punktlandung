import { describe, expect, it } from 'bun:test';
import { anteilText } from './anteil-text.ts';

describe('anteilText', () => {
  it('nennt den Anteil in ganzen Prozent', () => {
    expect(anteilText(0.4)).toBe('40 %');
    expect(anteilText(1 / 3)).toBe('33 %');
    expect(anteilText(1)).toBe('100 %');
    expect(anteilText(0)).toBe('0 %');
  });

  it('nennt einen sehr kleinen Anteil nicht null', () => {
    expect(anteilText(0.004)).toBe('unter 1 %');
  });
});
