import { Effect, Option } from 'effect';
import { defaultHalbjahr } from '#/features/halbjahre/services/current-halbjahr.ts';
import type { Halbjahr } from '#/features/halbjahre/services/halbjahr-service.ts';
import { listHalbjahre } from '#/features/halbjahre/services/halbjahr-service.ts';
import { listNoten } from '#/features/noten/services/noten-service.ts';
import { loadZeugnis } from '#/features/zeugnis/services/zeugnis-service.ts';
import { loadSchoolYearFachSnapshot } from '#/shared/noten/school-year-fach-snapshot.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';
import { InvalidInput, NoHalbjahr } from './errors/cli-errors.ts';

/*
 * Was der Befehl `punktlandung` liest. Jede Abfrage kommt aus den Features,
 * damit der Befehl dieselben Fächerstände, Gewichtungen und Schnitte zeigt wie
 * die App. Er liest nur Halbjahre, Fächer und Noten; die Datenbankrolle des
 * Befehls darf auch nichts anderes lesen.
 */

const halbjahrSummary = (halbjahr: Halbjahr) => ({
  id: halbjahr.id,
  label: formatHalbjahrLabel(halbjahr),
  klassenstufe: halbjahr.klassenstufe,
  schoolYear: halbjahr.schoolYear,
  half: halbjahr.half,
  system: halbjahr.system,
  startsOn: halbjahr.startsOn,
  endsOn: halbjahr.endsOn,
});

/** Alle Halbjahre, das zuletzt begonnene zuerst, und das ohne Auswahl gelesene. */
export const readHalbjahre = (today: string) =>
  Effect.map(listHalbjahre, (halbjahre) => ({
    defaultHalbjahrId: defaultHalbjahr(halbjahre, today)?.id ?? null,
    halbjahre: halbjahre.map((halbjahr) => ({
      ...halbjahrSummary(halbjahr),
      notenCount: halbjahr.notenCount,
    })),
  }));

const sameLabel = (halbjahr: Halbjahr, label: string) =>
  formatHalbjahrLabel(halbjahr).toUpperCase() === label.toUpperCase();

/**
 * Das gewählte Halbjahr, nach ID oder Bezeichnung wie "10.2" oder "J1.1",
 * sonst das, das die App ohne Auswahl zeigt. Eine Bezeichnung kann in zwei
 * Schuljahren vorkommen, wenn eine Klassenstufe wiederholt wurde; dann muss
 * die ID entscheiden.
 */
const chooseHalbjahr = (choice: Option.Option<string>, today: string) =>
  Effect.gen(function* () {
    const halbjahre = yield* listHalbjahre;
    if (Option.isNone(choice)) {
      const fallback = defaultHalbjahr(halbjahre, today);
      return (
        fallback ??
        (yield* new NoHalbjahr({
          message: 'Punktlandung has no Halbjahr yet.',
        }))
      );
    }
    const wanted = choice.value.trim();
    const byId = halbjahre.find((halbjahr) => halbjahr.id === wanted);
    if (byId !== undefined) {
      return byId;
    }
    const byLabel = halbjahre.filter((halbjahr) => sameLabel(halbjahr, wanted));
    const [only, ...others] = byLabel;
    if (only === undefined) {
      return yield* new InvalidInput({
        message: `No Halbjahr has the id or label "${wanted}". \`punktlandung halbjahre list\` lists them.`,
      });
    }
    if (others.length > 0) {
      return yield* new InvalidInput({
        message: `More than one Halbjahr is labelled "${wanted}" (school years ${byLabel.map((halbjahr) => halbjahr.schoolYear).join(', ')}). Pass its id instead.`,
      });
    }
    return only;
  });

/** Fächer und Leistungen eines Halbjahrs, wie die Notenseite sie zeigt. */
export const readNoten = (choice: Option.Option<string>, today: string) =>
  Effect.gen(function* () {
    const halbjahr = yield* chooseHalbjahr(choice, today);
    const faecher = yield* loadSchoolYearFachSnapshot(halbjahr.schoolYear);
    const noten = yield* listNoten(halbjahr.id);
    return {
      halbjahr: halbjahrSummary(halbjahr),
      faecher: faecher.map((fach) => ({
        id: fach.id,
        name: fach.name,
        shortName: fach.shortName,
        archived: fach.archived,
        gewichtung: fach.gewichtung,
      })),
      // Die Gewichtung steht einmal beim Fach statt an jeder Leistung.
      noten: noten.map(({ gewichtung: _gewichtung, ...leistung }) => leistung),
    };
  });

/** Das Zeugnis eines Halbjahrs, wie die Zeugnisseite es berechnet. */
export const readZeugnis = (choice: Option.Option<string>, today: string) =>
  Effect.flatMap(chooseHalbjahr(choice, today), (halbjahr) =>
    loadZeugnis(halbjahr.id),
  );
