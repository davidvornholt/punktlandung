import { trendEntries } from './trend-chart.story-fixtures.ts';
import { TrendChart } from './trend-chart.tsx';

export const OnScrollablePage = () => (
  <div className="min-h-[1600px] p-6">
    <h1>Notenverlauf</h1>
    <TrendChart entries={trendEntries} />
    <button type="button">Außerhalb</button>
  </div>
);
