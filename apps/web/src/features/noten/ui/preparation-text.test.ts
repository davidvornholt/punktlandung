import { describe, expect, it } from 'bun:test';

import { topicsText } from './preparation-text.ts';

describe('topicsText', () => {
  it('nennt den Stand der Themenliste in ganzen Worten', () => {
    expect(topicsText(null)).toBe('keine Themen');
    expect(topicsText({ total: 0, checked: 0 })).toBe('keine Themen');
    expect(topicsText({ total: 7, checked: 3 })).toBe('3 von 7 Themen sicher');
    expect(topicsText({ total: 4, checked: 4 })).toBe('alle 4 Themen sicher');
    expect(topicsText({ total: 1, checked: 1 })).toBe('das eine Thema sicher');
  });
});
