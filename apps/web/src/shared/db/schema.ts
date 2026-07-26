import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

import { klassenstufen } from '#/shared/school/klassenstufe.ts';

/** Notensystem eines Halbjahrs: Unterstufe 1–6, Kursstufe 0–15 Punkte. */
export const notensystemEnum = pgEnum('grade_system', ['sechser', 'punkte']);

/** Klassenstufen des Gymnasiums; J1/J2 sind die Jahrgänge der Kursstufe. */
export const klassenstufeEnum = pgEnum('klassenstufe', klassenstufen);

/** Leistungsart; Gewichte dafür verkündet die Lehrkraft je Fach vorab. */
export const leistungsartEnum = pgEnum('grade_kind', [
  'klausur',
  'test',
  'muendlich',
  'gfs',
  'sonstige',
]);

/** Wertungsbereich für die schriftlich/mündlich-Aufteilung eines Fachs. */
export const wertungsbereichEnum = pgEnum('grade_area', [
  'schriftlich',
  'muendlich',
]);

export const fachTable = pgTable('subject', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  /**
   * Anteil der schriftlichen Noten in Prozent (0–100), falls die Lehrkraft
   * bereichsweise gewichtet; null = eine gemeinsame gewichtete Liste.
   */
  schriftlichShare: integer('written_share'),
  /** Vorab verkündete Gewichte je Leistungsart, z. B. Klausur doppelt. */
  klausurGewichtung: numeric('klausur_weight', { precision: 4, scale: 2 })
    .notNull()
    .default('1'),
  testGewichtung: numeric('test_weight', { precision: 4, scale: 2 })
    .notNull()
    .default('1'),
  muendlichGewichtung: numeric('muendlich_weight', { precision: 4, scale: 2 })
    .notNull()
    .default('1'),
  gfsGewichtung: numeric('gfs_weight', { precision: 4, scale: 2 })
    .notNull()
    .default('1'),
  sonstigeGewichtung: numeric('sonstige_weight', { precision: 4, scale: 2 })
    .notNull()
    .default('1'),
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
    fachId: text('subject_id')
      .notNull()
      .references(() => fachTable.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    shortName: text('short_name').notNull(),
    schriftlichShare: integer('written_share'),
    klausurGewichtung: numeric('klausur_weight', { precision: 4, scale: 2 })
      .notNull()
      .default('1'),
    testGewichtung: numeric('test_weight', { precision: 4, scale: 2 })
      .notNull()
      .default('1'),
    muendlichGewichtung: numeric('muendlich_weight', { precision: 4, scale: 2 })
      .notNull()
      .default('1'),
    gfsGewichtung: numeric('gfs_weight', { precision: 4, scale: 2 })
      .notNull()
      .default('1'),
    sonstigeGewichtung: numeric('sonstige_weight', { precision: 4, scale: 2 })
      .notNull()
      .default('1'),
    sortOrder: integer('sort_order').notNull().default(0),
    archived: boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    unique('school_year_subject_school_year_subject_id_unique').on(
      table.schoolYear,
      table.fachId,
    ),
  ],
);

/** Markiert auch einen leeren Schuljahr-Fachstand als vollständig fixiert. */
export const schoolYearFachSetTable = pgTable('school_year_subject_set', {
  schoolYear: text('school_year').primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const halbjahrTable = pgTable(
  'term',
  {
    id: text('id').primaryKey(),
    /** Klassenstufe, z. B. "10" oder "J1"; ergibt mit `half` die Bezeichnung. */
    klassenstufe: klassenstufeEnum('klassenstufe').notNull(),
    /** Schuljahr, z. B. "2026/27". */
    schoolYear: text('school_year').notNull(),
    /** 1 oder 2 innerhalb des Schuljahrs. */
    number: integer('half').$type<1 | 2>().notNull(),
    notensystem: notensystemEnum('system').notNull(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
  },
  (table) => [
    unique('term_school_year_half_unique').on(table.schoolYear, table.number),
    check('term_half_valid', sql`${table.number} in (1, 2)`),
  ],
);

export const noteTable = pgTable('grade', {
  id: text('id').primaryKey(),
  fachId: text('subject_id')
    .notNull()
    .references(() => fachTable.id, { onDelete: 'cascade' }),
  halbjahrId: text('term_id')
    .notNull()
    .references(() => halbjahrTable.id, { onDelete: 'cascade' }),
  leistungsart: leistungsartEnum('kind').notNull(),
  wertungsbereich: wertungsbereichEnum('area').notNull(),
  /** Nativer Wert im System des Halbjahrs (1,00–6,00 bzw. 0–15). */
  notenwert: numeric('value', { precision: 4, scale: 2 }).notNull(),
  /** Individuelles Zusatzgewicht innerhalb der Leistungsart. */
  gewichtung: numeric('weight', { precision: 4, scale: 2 })
    .notNull()
    .default('1'),
  takenOn: date('taken_on').notNull(),
  comment: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Lerntage: ein Eintrag pro Tag und (optional) Fach. */
export const studyDayTable = pgTable(
  'study_day',
  {
    id: text('id').primaryKey(),
    day: date('day').notNull(),
    fachId: text('subject_id').references(() => fachTable.id, {
      onDelete: 'set null',
    }),
    minutes: integer('minutes'),
    comment: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    unique('study_day_day_subject_unique')
      .on(table.day, table.fachId)
      .nullsNotDistinct(),
  ],
);
