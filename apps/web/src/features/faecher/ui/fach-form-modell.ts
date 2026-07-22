import type { Fach } from '../services/fach-service.ts';

export const fachFormWerte = (fach: Fach | null) => ({
  name: fach?.name ?? '',
  shortName: fach?.shortName ?? '',
  writtenShare: fach?.writtenShare ?? '',
  klausurWeight: fach?.klausurWeight ?? 1,
  testWeight: fach?.testWeight ?? 1,
  muendlichWeight: fach?.muendlichWeight ?? 1,
  gfsWeight: fach?.gfsWeight ?? 1,
  sonstigeWeight: fach?.sonstigeWeight ?? 1,
});
