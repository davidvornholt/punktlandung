import { liveHalbjahrOperations } from './halbjahr-operations.ts';
import { HalbjahreVerwaltungBoundary } from './halbjahre-verwaltung-boundary.tsx';

export const HalbjahreVerwaltung = () => (
  <HalbjahreVerwaltungBoundary operations={liveHalbjahrOperations} />
);
