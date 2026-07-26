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

import { leistungsarten } from '#/shared/noten/notenwert.ts';
import { klassenstufen } from '#/shared/schule/klassenstufe.ts';

/** Notensystem eines Halbjahrs: Unterstufe 1–6, Kursstufe 0–15 Punkte. */
export const gradeSystem = pgEnum('grade_system', ['sechser', 'punkte']);

/** Klassenstufen des Gymnasiums; J1/J2 sind die Jahrgänge der Kursstufe. */
export const klassenstufeEnum = pgEnum('klassenstufe', klassenstufen);

/** Leistungsart; Gewichte dafür verkündet die Lehrkraft je Fach vorab. */
export const gradeKind = pgEnum('grade_kind', leistungsarten);

export const subject = pgTable('subject', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  /**
   * Die verkündete Gewichtung als Ganzes (Bereichsverhältnis und je
   * Leistungsart Bereich, Gewicht und Sammlung). Eine Spalte statt einer je
   * Leistungsart: nur so kopieren Fachstand-Historisierung und Formular
   * genau eine Form. Gelesen wird sie über `dekodiereGewichtung`.
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
export const schoolYearSubject = pgTable(
  'school_year_subject',
  {
    schoolYear: text('school_year').notNull(),
    subjectId: text('subject_id')
      .notNull()
      .references(() => subject.id, { onDelete: 'cascade' }),
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
export const schoolYearSubjectSet = pgTable('school_year_subject_set', {
  schoolYear: text('school_year').primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const term = pgTable(
  'term',
  {
    id: text('id').primaryKey(),
    /** Klassenstufe, z. B. "10" oder "J1"; ergibt mit `half` die Bezeichnung. */
    klassenstufe: klassenstufeEnum('klassenstufe').notNull(),
    /** Schuljahr, z. B. "2026/27". */
    schoolYear: text('school_year').notNull(),
    /** 1 oder 2 innerhalb des Schuljahrs. */
    half: integer('half').$type<1 | 2>().notNull(),
    system: gradeSystem('system').notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
  },
  (table) => [
    unique('term_school_year_half_unique').on(table.schoolYear, table.half),
    check('term_half_valid', sql`${table.half} in (1, 2)`),
  ],
);

export const grade = pgTable('grade', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subject.id, { onDelete: 'cascade' }),
  termId: text('term_id')
    .notNull()
    .references(() => term.id, { onDelete: 'cascade' }),
  kind: gradeKind('kind').notNull(),
  /** Nativer Wert im System des Halbjahrs (1,00–6,00 bzw. 0–15). */
  value: numeric('value', { precision: 4, scale: 2 }).notNull(),
  /** Individuelles Zusatzgewicht innerhalb der Leistungsart. */
  weight: numeric('weight', { precision: 4, scale: 2 }).notNull().default('1'),
  takenOn: date('taken_on').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Lerntage: ein Eintrag pro Tag und (optional) Fach. */
export const studyDay = pgTable(
  'study_day',
  {
    id: text('id').primaryKey(),
    day: date('day').notNull(),
    subjectId: text('subject_id').references(() => subject.id, {
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
