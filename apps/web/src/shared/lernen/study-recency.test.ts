import { describe, expect, it } from 'bun:test';

import { studyRecency, studyRecencyText } from './study-recency.ts';

const today = '2026-09-13';

describe('studyRecency', () => {
  it('meldet ohne Lerntage weder Abstand noch Wochenzahl', () => {
    expect(studyRecency([], today)).toEqual({ daysAgo: null, inLastWeek: 0 });
  });

  it('zählt den Abstand zum letzten Lerntag und die Tage der letzten Woche', () => {
    const days = ['2026-09-01', '2026-09-07', '2026-09-09', '2026-09-09'];
    expect(studyRecency(days, today)).toEqual({ daysAgo: 4, inLastWeek: 2 });
  });

  it('nimmt heute mit und lässt zukünftige Tage weg', () => {
    expect(studyRecency(['2026-09-13', '2026-09-20'], today)).toEqual({
      daysAgo: 0,
      inLastWeek: 1,
    });
  });
});

describe('studyRecencyText', () => {
  it('sagt, wann zuletzt dafür gelernt wurde, ohne Zeit zu nennen', () => {
    expect(studyRecencyText({ daysAgo: null, inLastWeek: 0 })).toBe(
      'noch nicht dafür gelernt',
    );
    expect(studyRecencyText({ daysAgo: 0, inLastWeek: 3 })).toBe(
      'heute gelernt · 3 von 7 Tagen',
    );
    expect(studyRecencyText({ daysAgo: 1, inLastWeek: 1 })).toBe(
      'zuletzt gestern gelernt · 1 von 7 Tagen',
    );
    expect(studyRecencyText({ daysAgo: 4, inLastWeek: 1 })).toBe(
      'zuletzt vor 4 Tagen gelernt · 1 von 7 Tagen',
    );
  });
});
