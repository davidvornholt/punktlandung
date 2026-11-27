import { describe, expect, it } from 'bun:test';

import { notenpunkteMarks, scaleBar } from './conversion-reference-model.ts';

describe('scaleBar', () => {
  it('legt die Skala mit Platz für ihren Rand in die Zeichnung', () => {
    const frame = scaleBar(1002.6);
    expect(frame.width).toBe(1002);
    expect(frame.height).toBe(54);
    expect(frame.x0).toBe(1);
    expect(frame.pitch).toBe(62.5);
  });

  it('wird nie schmaler, als ihre Ziffern Platz brauchen', () => {
    expect(scaleBar(120).width).toBe(240);
  });
});

describe('notenpunkteMarks', () => {
  it('stellt jeden Notenpunkt unter seine amtliche Notentendenz', () => {
    const frame = scaleBar(1002);
    const marks = notenpunkteMarks(frame);
    // 14 P. bei 1 ganz rechts, 0 P. bei 6 ganz links; 15 P. liegen jenseits der 1.
    expect(marks.map((mark) => mark.text)).toEqual([
      '14',
      '13',
      '12',
      '11',
      '10',
      '9',
      '8',
      '7',
      '6',
      '5',
      '4',
      '3',
      '2',
      '1',
      '0',
    ]);
    const xs = marks.map((mark) => mark.x);
    expect([...xs].sort((a, b) => b - a)).toEqual(xs);
    for (const x of xs) {
      expect(x).toBeGreaterThan(frame.x0);
      expect(x).toBeLessThan(frame.width - frame.x0);
    }
  });

  it('lässt zwischen 1 P. und 0 P. die Lücke, die die Tendenzen lassen', () => {
    const marks = notenpunkteMarks(scaleBar(1002));
    const at = (text: string): number =>
      marks.find((mark) => mark.text === text)?.x ?? Number.NaN;
    // 5- (1 P.) und 6 (0 P.) liegen drei Viertelnoten auseinander, 5 (2 P.) und 5- (1 P.) eine.
    expect(at('1') - at('0')).toBeCloseTo(3 * (at('2') - at('1')), 0);
  });

  it('nennt auf einer kurzen Skala nur die Notenpunkte der ganzen Noten', () => {
    const marks = notenpunkteMarks(scaleBar(358));
    expect(marks.map((mark) => mark.text)).toEqual([
      '14',
      '11',
      '8',
      '5',
      '2',
      '0',
    ]);
  });
});
