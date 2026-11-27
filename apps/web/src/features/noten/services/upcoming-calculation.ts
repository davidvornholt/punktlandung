import { daysBetween } from '#/shared/date/calendar-date.ts';
import {
  fachAverage,
  leistungsanteile,
} from '#/shared/noten/fach-aggregation.ts';
import type { Leistungsart, Notensystem } from '#/shared/noten/notenwert.ts';
import type { SchoolYearFach } from '#/shared/noten/school-year-fach-snapshot.ts';
import type { Klassenstufe } from '#/shared/school/klassenstufe.ts';
import { formatHalbjahrLabel } from '#/shared/school/klassenstufe.ts';

/** Eine Leistung, wie sie aus `grade` kommt — benotet oder ausstehend. */
export type UpcomingRow = {
  readonly id: string;
  readonly termId: string;
  readonly fachId: string;
  readonly kind: Leistungsart;
  readonly wert: number | null;
  readonly gewicht: number;
  readonly datum: string;
  readonly notiz: string | null;
};

export type UpcomingHalbjahr = {
  readonly id: string;
  readonly schoolYear: string;
  readonly system: Notensystem;
  readonly klassenstufe: Klassenstufe;
  readonly half: 1 | 2;
};

/** Eine ausstehende Leistung, wie die Übersicht sie zeigt. */
export type UpcomingLeistung = {
  readonly id: string;
  readonly kind: Leistungsart;
  readonly datum: string;
  readonly notiz: string | null;
  /** Tage bis zum Termin; negativ, wenn er vorbei ist. */
  readonly tageBis: number;
  /**
   * Der Anteil am Fachschnitt (0–1), den die Note haben wird, sobald jede
   * angekündigte Leistung des Fachs im Halbjahr eine hat. Die Übersicht zeigt
   * ihn als Größe des Kreises; er verschiebt sich mit jeder weiteren
   * angekündigten Leistung.
   */
  readonly anteil: number;
  readonly fachId: string;
  readonly fachName: string;
  readonly fachKuerzel: string;
  /** Aktueller Fachschnitt im System des Halbjahrs; null ohne benotete Leistung. */
  readonly fachschnitt: number | null;
  readonly system: Notensystem;
  readonly termId: string;
  readonly halbjahrLabel: string;
};

export type Upcoming = {
  /** Termin heute oder später; nächste zuerst. */
  readonly upcoming: ReadonlyArray<UpcomingLeistung>;
  /** Termin vorbei, Note fehlt; älteste zuerst. */
  readonly overdue: ReadonlyArray<UpcomingLeistung>;
};

const fachKey = (row: Pick<UpcomingRow, 'termId' | 'fachId'>) =>
  `${row.termId}:${row.fachId}`;

const groupByFach = (rows: ReadonlyArray<UpcomingRow>) => {
  const groups = new Map<string, Array<UpcomingRow>>();
  for (const row of rows) {
    const key = fachKey(row);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [row]);
    } else {
      group.push(row);
    }
  }
  return groups;
};

const byDatum = (left: UpcomingLeistung, right: UpcomingLeistung): number =>
  left.datum.localeCompare(right.datum) ||
  right.anteil - left.anteil ||
  left.fachName.localeCompare(right.fachName, 'de');

/**
 * Sammelt die ausstehenden Leistungen in der Reihenfolge ihrer Termine. Der
 * Anteil jeder Leistung entsteht aus allen Leistungen ihres Fachs im
 * Halbjahr, auch den ausstehenden — wer den Klausurenplan früh einträgt,
 * sieht so schon, wie viel jede Klausur zählen wird.
 */
export const calculateUpcoming = ({
  rows,
  halbjahre,
  faecherBySchoolYear,
  today,
}: {
  readonly rows: ReadonlyArray<UpcomingRow>;
  readonly halbjahre: ReadonlyMap<string, UpcomingHalbjahr>;
  readonly faecherBySchoolYear: ReadonlyMap<
    string,
    ReadonlyArray<SchoolYearFach>
  >;
  readonly today: string;
}): Upcoming => {
  const groups = groupByFach(rows);
  const leistungen = rows.flatMap((row): ReadonlyArray<UpcomingLeistung> => {
    const halbjahr = halbjahre.get(row.termId);
    const fach = faecherBySchoolYear
      .get(halbjahr?.schoolYear ?? '')
      ?.find((entry) => entry.id === row.fachId);
    if (row.wert !== null || halbjahr === undefined || fach === undefined) {
      return [];
    }
    const group = groups.get(fachKey(row)) ?? [];
    const anteil =
      leistungsanteile(
        group.map((entry) => ({
          id: entry.id,
          individualGewichtung: entry.gewicht,
          leistungsart: entry.kind,
        })),
        fach.gewichtung,
      ).get(row.id) ?? 0;
    const fachschnitt = fachAverage(
      group.flatMap((entry) =>
        entry.wert === null
          ? []
          : [
              {
                notenwert: entry.wert,
                individualGewichtung: entry.gewicht,
                leistungsart: entry.kind,
              },
            ],
      ),
      fach.gewichtung,
    );
    return [
      {
        id: row.id,
        kind: row.kind,
        datum: row.datum,
        notiz: row.notiz,
        tageBis: daysBetween(today, row.datum),
        anteil,
        fachId: fach.id,
        fachName: fach.name,
        fachKuerzel: fach.shortName,
        fachschnitt,
        system: halbjahr.system,
        termId: halbjahr.id,
        halbjahrLabel: formatHalbjahrLabel(halbjahr),
      },
    ];
  });
  return {
    upcoming: leistungen
      .filter((leistung) => leistung.tageBis >= 0)
      .sort(byDatum),
    overdue: leistungen
      .filter((leistung) => leistung.tageBis < 0)
      .sort(byDatum),
  };
};
