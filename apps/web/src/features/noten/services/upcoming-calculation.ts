import { daysBetween } from '#/shared/date/calendar-date.ts';
import type { TopicProgress } from '#/shared/markdown/task-lines.ts';
import { topicProgress } from '#/shared/markdown/task-lines.ts';
import { byDringlichkeit } from '#/shared/noten/dringlichkeit.ts';
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
  readonly preparation: string | null;
};

export type UpcomingHalbjahr = {
  readonly id: string;
  readonly schoolYear: string;
  readonly system: Notensystem;
  readonly klassenstufe: Klassenstufe;
  readonly half: 1 | 2;
};

/**
 * Eine ausstehende Leistung, wie die Übersicht sie zeigt. Der Anteil, nach
 * dem sie geordnet wurde, fehlt absichtlich: er verschiebt sich mit jeder
 * weiteren angekündigten Leistung und soll nicht auf den Schirm.
 */
export type UpcomingLeistung = {
  readonly id: string;
  readonly kind: Leistungsart;
  readonly datum: string;
  /** Tage bis zum Termin; negativ, wenn er vorbei ist. */
  readonly tageBis: number;
  readonly fachId: string;
  readonly fachName: string;
  readonly fachKuerzel: string;
  /** Aktueller Fachschnitt im System des Halbjahrs; null ohne benotete Leistung. */
  readonly fachschnitt: number | null;
  /** Fortschritt der Themenliste; null, solange keine Vorbereitung angelegt ist. */
  readonly topics: TopicProgress | null;
  readonly system: Notensystem;
  readonly termId: string;
  readonly halbjahrLabel: string;
};

export type Upcoming = {
  /** Termin heute oder später, dringendste zuerst. */
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

/**
 * Sammelt die ausstehenden Leistungen und ordnet sie nach Dringlichkeit. Der
 * Anteil jeder Leistung entsteht aus allen Leistungen ihres Fachs im
 * Halbjahr, auch den ausstehenden — wer den Klausurenplan früh einträgt,
 * bekommt so eine Reihenfolge, die schon stimmt.
 */
export const calculateUpcoming = (
  rows: ReadonlyArray<UpcomingRow>,
  halbjahre: ReadonlyMap<string, UpcomingHalbjahr>,
  faecherBySchoolYear: ReadonlyMap<string, ReadonlyArray<SchoolYearFach>>,
  today: string,
): Upcoming => {
  const groups = groupByFach(rows);
  const ranked = rows.flatMap((row) => {
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
        anteil,
        leistung: {
          id: row.id,
          kind: row.kind,
          datum: row.datum,
          tageBis: daysBetween(today, row.datum),
          fachId: fach.id,
          fachName: fach.name,
          fachKuerzel: fach.shortName,
          fachschnitt,
          topics:
            row.preparation === null ? null : topicProgress(row.preparation),
          system: halbjahr.system,
          termId: halbjahr.id,
          halbjahrLabel: formatHalbjahrLabel(halbjahr),
        } satisfies UpcomingLeistung,
      },
    ];
  });
  return {
    upcoming: ranked
      .filter((entry) => entry.leistung.tageBis >= 0)
      .map((entry) => ({ ...entry.leistung, anteil: entry.anteil }))
      .sort(byDringlichkeit)
      .map(({ anteil: _anteil, ...leistung }) => leistung),
    overdue: ranked
      .map((entry) => entry.leistung)
      .filter((leistung) => leistung.tageBis < 0)
      .sort((left, right) => left.datum.localeCompare(right.datum)),
  };
};
