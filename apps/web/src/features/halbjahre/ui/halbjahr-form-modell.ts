import type { Halbjahr } from '../services/halbjahr-service.ts';

export const halbjahrFormWerte = (halbjahr: Halbjahr | null) => ({
  label: halbjahr?.label ?? '',
  schoolYear: halbjahr?.schoolYear ?? '',
  half: halbjahr?.half ?? 1,
  system: halbjahr?.system ?? 'sechser',
  startsOn: halbjahr?.startsOn ?? '',
  endsOn: halbjahr?.endsOn ?? '',
});
