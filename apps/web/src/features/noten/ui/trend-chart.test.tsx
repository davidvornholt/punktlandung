import { describe, expect, it, mock } from 'bun:test';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { TrendEntry } from '../services/trend-calculation.ts';

type StubProps = {
  readonly children?: ReactNode;
};

type ChartStubProps = StubProps & {
  readonly accessibilityLayer?: boolean;
  readonly 'aria-hidden'?: boolean | 'false' | 'true';
};

const textMarkupPattern = /<[^>]+>/gu;
const summaryPattern = /<summary[^>]*>(?<content>[\s\S]*?)<\/summary>/gu;
const headerPattern = /<th[^>]*>(?<content>[\s\S]*?)<\/th>/gu;
const cellPattern = /<td[^>]*>(?<content>[\s\S]*?)<\/td>/gu;
const chartTagPattern = /<svg[^>]*data-trend-chart=""[^>]*>/u;

const emptyStub = () => null;

const lineChartStub = ({
  accessibilityLayer,
  'aria-hidden': ariaHidden,
  children,
}: ChartStubProps) =>
  createElement(
    'svg',
    {
      'aria-hidden': ariaHidden,
      'data-accessibility-layer': String(accessibilityLayer),
      'data-trend-chart': '',
    },
    createElement('title', null, 'Presentation-only trend chart test stub'),
    children,
  );

const responsiveContainerStub = ({ children }: StubProps) =>
  createElement('div', null, children);

mock.module('recharts', () =>
  Object.fromEntries([
    ['CartesianGrid', emptyStub],
    ['Line', emptyStub],
    ['LineChart', lineChartStub],
    ['ResponsiveContainer', responsiveContainerStub],
    ['Tooltip', emptyStub],
    ['XAxis', emptyStub],
    ['YAxis', emptyStub],
  ]),
);

const { TrendChart } = await import('./trend-chart.tsx');

const entry = (overrides: Partial<TrendEntry> = {}): TrendEntry => ({
  datum: '2026-09-14',
  fachKuerzel: 'M',
  fachName: 'Mathematik',
  punkte: 11,
  schnitt: 11,
  notenwert: 11,
  notensystem: 'punkte',
  leistungsart: 'klausur',
  klassenstufe: 'J1',
  half: 1,
  ...overrides,
});

const selectText = (markup: string, pattern: RegExp): ReadonlyArray<string> =>
  [...markup.matchAll(pattern)].map((match) =>
    (match.groups?.content ?? '')
      .replace(textMarkupPattern, '')
      .replace(/\s+/gu, ' ')
      .trim(),
  );

describe('TrendChart', () => {
  it('renders a native disclosure with the complete accessible trend data', () => {
    const markup = renderToStaticMarkup(
      <TrendChart
        entries={[
          entry(),
          entry({
            datum: '2026-10-02',
            fachKuerzel: 'D',
            fachName: 'Deutsch',
            punkte: 7,
            schnitt: 9,
            notenwert: 2.75,
            notensystem: 'sechser',
            leistungsart: 'gfs',
            klassenstufe: '10',
            half: 2,
          }),
        ]}
      />,
    );

    expect(markup).toContain('<details');
    expect(selectText(markup, summaryPattern)).toEqual([
      'Notenpunkte als Tabelle anzeigen',
    ]);
    expect(selectText(markup, headerPattern)).toEqual([
      'Halbjahr',
      'Leistungsart',
      'Datum',
      'Fach',
      'Eingetragene Note',
      'Kurvenwert in Notenpunkten',
      'Laufender Schnitt in Notenpunkten',
    ]);
    expect(selectText(markup, cellPattern)).toEqual([
      'J1.1',
      'Klausur',
      '14.09.2026',
      'Mathematik',
      '11 P.',
      '11 P.',
      '11 P.',
      '10.2',
      'GFS',
      '02.10.2026',
      'Deutsch',
      '2,75',
      '7 P.',
      '9 P.',
    ]);
    const chartTag = markup.match(chartTagPattern)?.[0];
    expect(chartTag).toContain('aria-hidden="true"');
    expect(chartTag).toContain('data-accessibility-layer="false"');
    expect(chartTag).not.toContain('role=');
    expect(chartTag).not.toContain('tabindex=');
  });
});
