import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

import { leistungsarten, notensysteme } from '#/shared/noten/notenwert.ts';
import { klassenstufen } from '#/shared/school/klassenstufe.ts';

/** Notensystem eines Halbjahrs: Unterstufe 1–6, Kursstufe 0–15 Punkte. */
export const notensystemEnum = pgEnum('grade_system', notensysteme);

/** Klassenstufen des Gymnasiums; J1/J2 sind die Jahrgänge der Kursstufe. */
export const klassenstufeEnum = pgEnum('klassenstufe', klassenstufen);

/** Leistungsart; Gewichte dafür verkündet die Lehrkraft je Fach vorab. */
export const leistungsartEnum = pgEnum('grade_kind', leistungsarten);

export const fachTable = pgTable('subject', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  /**
   * Die verkündete Gewichtung als Ganzes: optionales Bereichsverhältnis sowie
   * Gewicht und Sammlung je Leistungsart. Eine Spalte statt einer je Art: nur
   * so kopieren Fachstand-Historisierung und Formular genau eine Form. Gelesen
   * wird sie über `decodeGewichtung`.
   */
  weighting: jsonb('weighting').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Vollständiger, unveränderlich historisierbarer Fachstand eines Schuljahrs.
 * `subject` bleibt die stabile Identität und dient bestehenden Installationen
 * bis zur ersten atomaren Materialisierung als Legacy-Ausgangsstand.
 */
export const schoolYearFachTable = pgTable(
  'school_year_subject',
  {
    schoolYear: text('school_year').notNull(),
    subjectId: text('subject_id')
      .notNull()
      .references(() => fachTable.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    shortName: text('short_name').notNull(),
    weighting: jsonb('weighting').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    archived: boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    unique('school_year_subject_school_year_subject_id_unique').on(
      table.schoolYear,
      table.subjectId,
    ),
  ],
);

/** Markiert auch einen leeren Schuljahr-Fachstand als vollständig fixiert. */
export const schoolYearFachSetTable = pgTable('school_year_subject_set', {
  schoolYear: text('school_year').primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Ein Schuljahr ist eine Klassenstufe: Beide Halbjahre eines Schuljahrs
 * teilen `klassenstufe` und `system`. Drizzle kann die dafür nötigen
 * Exclusion-Constraints (`term_school_year_klassenstufe_shared`,
 * `term_school_year_system_shared`) nicht ausdrücken; sie stehen in den
 * Custom-Migrationen `0009_eine_klassenstufe_je_schuljahr` und
 * `0010_klassenstufe_je_schuljahr_korrigierbar`. Sie sind
 * `DEFERRABLE INITIALLY IMMEDIATE`, damit eine Anweisung die Klassenstufe
 * beider Halbjahre zugleich korrigieren kann.
 */
export const halbjahrTable = pgTable(
  'term',
  {
    id: text('id').primaryKey(),
    /** Klassenstufe, z. B. "10" oder "J1"; ergibt mit `half` die Bezeichnung. */
    klassenstufe: klassenstufeEnum('klassenstufe').notNull(),
    /** Schuljahr, z. B. "2026/27". */
    schoolYear: text('school_year').notNull(),
    /** 1 oder 2 innerhalb des Schuljahrs. */
    half: integer('half').$type<1 | 2>().notNull(),
    system: notensystemEnum('system').notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
  },
  (table) => [
    unique('term_school_year_half_unique').on(table.schoolYear, table.half),
    check('term_half_valid', sql`${table.half} in (1, 2)`),
  ],
);

/**
 * Eine Leistung: Klausur, Test, GFS, mündliche oder sonstige Note. Sie kann
 * vor ihrer Note angelegt werden — dann ist `value` null und `taken_on` der
 * angekündigte Termin. Nur `planbareLeistungsarten` dürfen ausstehen.
 */
export const noteTable = pgTable(
  'grade',
  {
    id: text('id').primaryKey(),
    subjectId: text('subject_id')
      .notNull()
      .references(() => fachTable.id, { onDelete: 'cascade' }),
    termId: text('term_id')
      .notNull()
      .references(() => halbjahrTable.id, { onDelete: 'cascade' }),
    kind: leistungsartEnum('kind').notNull(),
    /** Nativer Wert im System des Halbjahrs (1,00–6,00 bzw. 0–15); null = ausstehend. */
    value: numeric('value', { precision: 4, scale: 2 }),
    /** Individuelles Zusatzgewicht innerhalb der Leistungsart. */
    weight: numeric('weight', { precision: 4, scale: 2 })
      .notNull()
      .default('1'),
    /** Termin der Leistung: angekündigt, solange sie aussteht, sonst der Tag der Arbeit. */
    takenOn: date('taken_on').notNull(),
    note: text('note'),
    // Die Datenbank hält noch die unbenutzte Spalte `preparation`, bis ein
    // Folge-PR sie entfernt. Sie fehlt hier mit Absicht: Drizzle nennt jede
    // Spalte dieser Definition in jedem Insert und jedem vollen Select, und
    // diese Version muss auch ohne die Spalte laufen. `db:generate` erzeugt
    // deshalb ihr DROP COLUMN; das gehört erst in den Folge-PR.
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    check(
      'grade_value_required_unless_planbar',
      sql`${table.value} is not null or ${table.kind} in ('klausur', 'test', 'gfs')`,
    ),
  ],
);

/**
 * Die IDs aller Abgaben des Notenformulars, die der Server verarbeitet hat.
 * Sie bleibt bestehen, wenn die Note gelöscht wird, damit ein erneutes Senden
 * derselben Abgabe sie nicht wieder anlegt. Bewusst ohne Verweis auf `grade`.
 */
export const noteSubmissionTable = pgTable('grade_submission', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// `preparation_template`, `study_day` und `study_day_grade` sind unbenutzt.
// Sie bleiben hier definiert, damit `db:generate` sie nicht löscht, solange
// die vorige Version sie noch braucht; ein Folge-PR entfernt sie.
export const preparationTemplateTable = pgTable('preparation_template', {
  kind: leistungsartEnum('kind').primaryKey(),
  content: text('content').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const studyDayTable = pgTable(
  'study_day',
  {
    id: text('id').primaryKey(),
    day: date('day').notNull(),
    subjectId: text('subject_id').references(() => fachTable.id, {
      onDelete: 'set null',
    }),
    minutes: integer('minutes'),
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    unique('study_day_day_subject_unique')
      .on(table.day, table.subjectId)
      .nullsNotDistinct(),
  ],
);

export const studyDayGradeTable = pgTable(
  'study_day_grade',
  {
    studyDayId: text('study_day_id')
      .notNull()
      .references(() => studyDayTable.id, { onDelete: 'cascade' }),
    gradeId: text('grade_id')
      .notNull()
      .references(() => noteTable.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('study_day_grade_unique').on(table.studyDayId, table.gradeId),
  ],
);
