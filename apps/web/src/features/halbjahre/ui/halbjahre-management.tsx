import { liveHalbjahrOperations } from './halbjahr-operations.ts';
import { HalbjahreManagementBoundary } from './halbjahre-management-boundary.tsx';

export const HalbjahreManagement = () => (
  <HalbjahreManagementBoundary operations={liveHalbjahrOperations} />
);
