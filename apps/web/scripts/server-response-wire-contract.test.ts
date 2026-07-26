import { describe, expect, it } from 'bun:test';

import type { Fach } from '#/features/faecher/services/fach-service.ts';
import type { Halbjahr } from '#/features/halbjahre/services/halbjahr-service.ts';
import type { LearningStatistics } from '#/features/learning/services/learning-statistics.ts';
import type { NoteWithFach } from '#/features/noten/services/noten-service.ts';
import type { TrendEntry } from '#/features/noten/services/trend-calculation.ts';
import type { Zeugnis } from '#/features/zeugnis/services/zeugnis-service.ts';
import type { studyDayTable } from '#/shared/db/schema.ts';

const keys = (value: unknown): ReadonlyArray<string> =>
  Object.keys(JSON.parse(JSON.stringify(value))).sort();

describe('Fach and Halbjahr response wire contract', () => {
  it('keeps the pre-rename Fach result keys', () => {
    const fach: Fach = {
      id: 'mathematik',
      name: 'Mathematik',
      shortName: 'M',
      writtenShare: 50,
      klausurWeight: 2,
      testWeight: 1,
      muendlichWeight: 1,
      gfsWeight: 1,
      sonstigeWeight: 1,
      sortOrder: 0,
    };
    expect(keys(fach)).toEqual([
      'gfsWeight',
      'id',
      'klausurWeight',
      'muendlichWeight',
      'name',
      'shortName',
      'sonstigeWeight',
      'sortOrder',
      'testWeight',
      'writtenShare',
    ]);
  });

  it('keeps the pre-rename Halbjahr result keys', () => {
    const halbjahr: Halbjahr = {
      id: 'halbjahr-1',
      klassenstufe: '10',
      schoolYear: '2026/27',
      half: 1,
      system: 'sechser',
      startsOn: '2026-08-01',
      endsOn: '2027-01-31',
    };
    expect(keys(halbjahr)).toEqual([
      'endsOn',
      'half',
      'id',
      'klassenstufe',
      'schoolYear',
      'startsOn',
      'system',
    ]);
  });
});

describe('Lerntag response wire contract', () => {
  it('keeps the pre-rename Lerntag and statistics result keys', () => {
    const studyDay: typeof studyDayTable.$inferSelect = {
      id: 'study-day-1',
      day: '2026-10-01',
      subjectId: 'mathematik',
      minutes: 30,
      note: null,
      createdAt: new Date('2026-10-01T00:00:00Z'),
    };
    const statistics: LearningStatistics = {
      tageDiesenMonat: 1,
      serie: 1,
    };
    expect(keys(studyDay)).toEqual([
      'createdAt',
      'day',
      'id',
      'minutes',
      'note',
      'subjectId',
    ]);
    expect(keys(statistics)).toEqual(['serie', 'tageDiesenMonat']);
  });
});

describe('Note and Zeugnis response wire contract', () => {
  it('keeps the pre-rename Note and trend result keys', () => {
    const note: NoteWithFach = {
      id: 'note-1',
      kind: 'klausur',
      area: 'schriftlich',
      wert: 2,
      gewicht: 1,
      datum: '2026-10-01',
      notiz: null,
      fachId: 'mathematik',
      fachName: 'Mathematik',
      fachKuerzel: 'M',
      gewichtung: {
        writtenShare: 50,
        kindWeights: {
          klausur: 2,
          test: 1,
          muendlich: 1,
          gfs: 1,
          sonstige: 1,
        },
      },
    };
    const trend: TrendEntry = {
      datum: '2026-10-01',
      punkte: 11,
      schnitt: 11,
      fachKuerzel: 'M',
    };
    expect(keys(note)).toEqual([
      'area',
      'datum',
      'fachId',
      'fachKuerzel',
      'fachName',
      'gewicht',
      'gewichtung',
      'id',
      'kind',
      'notiz',
      'wert',
    ]);
    expect(keys(note.gewichtung)).toEqual(['kindWeights', 'writtenShare']);
    expect(keys(trend)).toEqual(['datum', 'fachKuerzel', 'punkte', 'schnitt']);
  });

  it('keeps the pre-rename Zeugnis result keys', () => {
    const zeugnis: Zeugnis = {
      termId: 'halbjahr-1',
      label: '10.1',
      schoolYear: '2026/27',
      system: 'sechser',
      gesamtschnitt: '2,5',
      zeilen: [
        {
          fachId: 'mathematik',
          fachName: 'Mathematik',
          anzeige: '2+',
          anzahlNoten: 2,
        },
      ],
      jahresvorschau: [
        {
          fachId: 'mathematik',
          fachName: 'Mathematik',
          note: 2,
          grenzfall: false,
        },
      ],
    };
    expect(keys(zeugnis)).toEqual([
      'gesamtschnitt',
      'jahresvorschau',
      'label',
      'schoolYear',
      'system',
      'termId',
      'zeilen',
    ]);
    expect(keys(zeugnis.zeilen[0])).toEqual([
      'anzahlNoten',
      'anzeige',
      'fachId',
      'fachName',
    ]);
  });
});
