import { describe, expect, it } from 'bun:test';
import { formatNote } from '../../noten/zeugnisnote.ts';
import {
  formatFulcrum,
  nearestStep,
  punkteScale,
  scaleUnits,
  sechserScale,
} from './scale.ts';

describe('punkteScale', () => {
  it('legt jeden Notenpunkt in die Mitte seiner Einheit', () => {
    expect(punkteScale.unitOf(0)).toBe(0.5);
    expect(punkteScale.unitOf(15)).toBe(15.5);
    expect(punkteScale.valueOf(11.5)).toBe(11);
  });

  it('teilt die Latte lückenlos in die sechs Noten', () => {
    expect(punkteScale.bands.map((band) => [band.from, band.to])).toEqual([
      [0, 1],
      [1, 4],
      [4, 7],
      [7, 10],
      [10, 13],
      [13, 16],
    ]);
    expect(punkteScale.grades.map((grade) => grade.text).join('')).toBe(
      '654321',
    );
  });

  it('zeichnet umso feinere Striche, je mehr Platz ein Notenpunkt hat', () => {
    const topTicks = (pitch: number) =>
      punkteScale.ticks(pitch).filter((tick) => tick.from === 0).length;
    expect(topTicks(20)).toBe(16);
    expect(topTicks(40)).toBe(31);
    expect(topTicks(60)).toBe(151);
  });
});

describe('sechserScale', () => {
  it('läuft von 6 links nach 1 rechts in 21 gleich breiten Viertelschritten', () => {
    expect(sechserScale.steps).toHaveLength(21);
    expect(sechserScale.steps[0]).toBe(6);
    expect(sechserScale.steps.at(-1)).toBe(1);
    const width = scaleUnits / 21;
    expect(sechserScale.unitOf(6)).toBeCloseTo(width / 2, 10);
    expect(sechserScale.unitOf(1)).toBeCloseTo(scaleUnits - width / 2, 10);
    expect(sechserScale.unitOf(2.25) - sechserScale.unitOf(2.5)).toBeCloseTo(
      width,
      10,
    );
  });

  it('rechnet einen Ort auf der Latte in die Note zurück', () => {
    for (const note of sechserScale.steps) {
      expect(sechserScale.valueOf(sechserScale.unitOf(note))).toBeCloseTo(
        note,
        10,
      );
    }
  });

  it('bleibt linear, damit der Schwerpunkt der Scheiben ihr Schnitt ist', () => {
    const noten = [1.25, 2.5, 4];
    const mean = noten.reduce((sum, note) => sum + note, 0) / noten.length;
    const centre =
      noten.reduce((sum, note) => sum + sechserScale.unitOf(note), 0) /
      noten.length;
    expect(centre).toBeCloseTo(sechserScale.unitOf(mean), 10);
  });

  it('wechselt den Block dort, wo auf die ganze Note gerundet wird', () => {
    const [six, five] = sechserScale.bands;
    expect(six?.from).toBe(0);
    expect(six?.to).toBeCloseTo(sechserScale.unitOf(5.5), 10);
    expect(five?.from).toBeCloseTo(sechserScale.unitOf(5.5), 10);
    expect(sechserScale.bands.at(-1)?.to).toBe(scaleUnits);
  });
});

describe('nearestStep', () => {
  it('findet den Wert unter dem Zeiger', () => {
    expect(nearestStep(punkteScale, 11.2)).toBe(11);
    expect(nearestStep(punkteScale, 0)).toBe(0);
    expect(nearestStep(punkteScale, 99)).toBe(15);
    expect(nearestStep(sechserScale, sechserScale.unitOf(2.3))).toBe(2.25);
  });
});

describe('formatFulcrum', () => {
  it('zeigt in Bewegung eine Nachkommastelle und in Ruhe den genauen Schnitt', () => {
    expect(formatFulcrum(punkteScale, 11.5, false)).toBe('11,0 P.');
    expect(formatFulcrum(punkteScale, 11.166, true)).toBe('10,67 P.');
    expect(formatFulcrum(sechserScale, sechserScale.unitOf(2.25), true)).toBe(
      '2,25',
    );
    expect(formatFulcrum(sechserScale, sechserScale.unitOf(2.25), false)).toBe(
      '2,3',
    );
  });

  it('druckt in Ruhe den Schnitt, wie er gegeben wurde, nicht den von der Latte zurückgerechneten', () => {
    // 2,875 liegt auf einer Rundungsgrenze: Von der Latte zurückgerechnet wird daraus 2,87.
    const unit = sechserScale.unitOf(2.875);
    expect(formatFulcrum(sechserScale, unit, true)).toBe('2,87');
    expect(formatFulcrum(sechserScale, unit, true, 2.875)).toBe('2,88');
    // Jeder Schnitt aus Vierteln, Dritteln und Fünfteln steht in Ruhe so da, wie formatNote ihn schreibt.
    const off = [sechserScale, punkteScale].flatMap((scale) => {
      const [low, high] = scale.system === 'sechser' ? [1, 6] : [0, 15];
      return [4, 12, 20, 40].flatMap((parts) =>
        Array.from(
          { length: (high - low) * parts + 1 },
          (_, index) => low + index / parts,
        ).filter(
          (value) =>
            formatFulcrum(scale, scale.unitOf(value), true, value) !==
            formatNote(value, scale.system),
        ),
      );
    });
    expect(off).toEqual([]);
  });

  it('druckt schon in Bewegung den endgültigen Schnitt, sobald die Stelle ihn ergibt', () => {
    const unit = punkteScale.unitOf(10.68);
    const almost = unit - 0.002;
    expect(formatFulcrum(punkteScale, unit - 0.2, false, 10.68)).toBe(
      '10,5 P.',
    );
    expect(formatFulcrum(punkteScale, almost, false, 10.68)).toBe('10,68 P.');
    // Ohne Ziel bleibt es bei einer Nachkommastelle.
    expect(formatFulcrum(punkteScale, almost, false)).toBe('10,7 P.');
  });

  it('hält sich an die Stelle der Latte, solange der Drehpunkt woanders ruht', () => {
    expect(
      formatFulcrum(sechserScale, sechserScale.unitOf(2.25), true, 3.5),
    ).toBe('2,25');
  });
});
