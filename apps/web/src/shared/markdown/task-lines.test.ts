import { describe, expect, it } from 'bun:test';

import { toggleTaskLine, topicProgress } from './task-lines.ts';

const vorbereitung = [
  '## Themen',
  '',
  '- [ ] Integralrechnung',
  '- [x] Ableitungsregeln',
  '  - [X] Kettenregel',
  '* [ ] Kurvendiskussion',
  '1. [ ] Altklausur 2024',
  '',
  '## Notizen',
  '',
  '- kein Thema, nur eine Notiz',
  '- [] auch kein Thema',
  '',
  '```',
  '- [ ] steht im Codeblock',
  '```',
].join('\n');

describe('topicProgress', () => {
  it('zählt Aufgabenzeilen mit allen Listenzeichen, aber nichts in Codeblöcken', () => {
    expect(topicProgress(vorbereitung)).toEqual({ total: 5, checked: 2 });
  });

  it('meldet ohne Aufgabenzeilen null Themen', () => {
    expect(topicProgress('Nur Notizen.\n\n- ein Punkt')).toEqual({
      total: 0,
      checked: 0,
    });
    expect(topicProgress('')).toEqual({ total: 0, checked: 0 });
  });
});

describe('toggleTaskLine', () => {
  it('hakt eine offene Zeile ab und nimmt eine abgehakte zurück', () => {
    const checked = toggleTaskLine(vorbereitung, 3);
    expect(checked.split('\n')[2]).toBe('- [x] Integralrechnung');
    expect(topicProgress(checked).checked).toBe(3);

    const unchecked = toggleTaskLine(checked, 5);
    expect(unchecked.split('\n')[4]).toBe('  - [ ] Kettenregel');
  });

  it('lässt den Text unverändert, wenn die Zeile keine Aufgabenzeile ist', () => {
    expect(toggleTaskLine(vorbereitung, 1)).toBe(vorbereitung);
    expect(toggleTaskLine(vorbereitung, 15)).toBe(vorbereitung);
    expect(toggleTaskLine(vorbereitung, 99)).toBe(vorbereitung);
  });
});
