import { useState } from 'react';

import type { Klassenstufe } from '#/shared/school/klassenstufe.ts';
import { halbjahrDateRange } from '#/shared/school/school-year.ts';
import type { Stretch } from './halbjahr-look.ts';
import { HalbjahrTimeline } from './halbjahr-timeline.tsx';
import type { TimelineCandidate } from './halbjahr-timeline-model.ts';

const today = '2026-11-26';

const stretch = (
  klassenstufe: Klassenstufe,
  half: 1 | 2,
  schoolYear: string,
): Stretch => ({
  ...halbjahrDateRange(schoolYear, half),
  half,
  id: `${klassenstufe}.${half}`,
  klassenstufe,
  schoolYear,
});

const year = (
  klassenstufe: Klassenstufe,
  schoolYear: string,
): ReadonlyArray<Stretch> => [
  stretch(klassenstufe, 1, schoolYear),
  stretch(klassenstufe, 2, schoolYear),
];

const laufbahn = [
  ...year('9', '2024/25'),
  ...year('10', '2025/26'),
  stretch('J1', 1, '2026/27'),
];

const ganzeSchulzeit = [
  ...year('5', '2020/21'),
  ...year('6', '2021/22'),
  ...year('7', '2022/23'),
  ...year('8', '2023/24'),
  ...laufbahn,
];

const Scene = ({
  candidate = null,
  halbjahre,
  now = today,
}: {
  readonly candidate?: TimelineCandidate | null;
  readonly halbjahre: ReadonlyArray<Stretch>;
  readonly now?: string;
}) => {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  return (
    <main className="p-4">
      <HalbjahrTimeline
        candidate={candidate}
        halbjahre={halbjahre}
        highlightId={highlightId}
        onHighlight={setHighlightId}
        today={now}
      />
      <output aria-label="Hervorgehoben">{highlightId ?? 'nichts'}</output>
    </main>
  );
};

/** Klasse 9 to J1.1: two Notensysteme, the second Halbjahr of J1 still missing. */
export const Laufbahn = () => <Scene halbjahre={laufbahn} />;

/** The form holds J1.2, which the line shows dashed and lifted. */
export const MitFormular = () => (
  <Scene
    candidate={{ ...stretch('J1', 2, '2026/27'), replaces: null }}
    halbjahre={laufbahn}
  />
);

/** Thirteen Halbjahre: on a phone not every name fits. */
export const GanzeSchulzeit = () => <Scene halbjahre={ganzeSchulzeit} />;

/** After the summer no Halbjahr covers today; the line reaches on to show it. */
export const NachDemSommer = () => (
  <Scene halbjahre={laufbahn} now="2027-09-15" />
);

/** Entered ahead of time: both Halbjahre of J1 lie ahead of a day in July. */
export const Voraus = () => (
  <Scene
    halbjahre={[...year('10', '2025/26'), ...year('J1', '2026/27')]}
    now="2026-07-10"
  />
);
