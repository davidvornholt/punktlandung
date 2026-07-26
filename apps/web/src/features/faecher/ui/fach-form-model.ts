import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fach } from '../services/fach-service.ts';

export const fachFormValues = (fach: Fach | null) => ({
  name: fach?.name ?? '',
  shortName: fach?.shortName ?? '',
  gewichtung: fach?.gewichtung ?? standardgewichtung,
});
