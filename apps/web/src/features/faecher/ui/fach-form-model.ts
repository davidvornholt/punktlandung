import type { Fach } from '../services/fach-service.ts';

export const fachFormValues = (fach: Fach | null) => ({
  name: fach?.name ?? '',
  shortName: fach?.shortName ?? '',
  schriftlichShare: fach?.schriftlichShare ?? '',
  klausurGewichtung: fach?.klausurGewichtung ?? 1,
  testGewichtung: fach?.testGewichtung ?? 1,
  muendlichGewichtung: fach?.muendlichGewichtung ?? 1,
  gfsGewichtung: fach?.gfsGewichtung ?? 1,
  sonstigeGewichtung: fach?.sonstigeGewichtung ?? 1,
});
