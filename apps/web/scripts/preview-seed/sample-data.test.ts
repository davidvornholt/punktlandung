import { describe, expect, it } from 'bun:test';
import { Schema } from 'effect';
import { HalbjahrInput } from '#/features/halbjahre/schemas/halbjahr-schema.ts';
import { FachgewichtungSchema } from '#/shared/noten/fach-gewichtung.ts';
import { isPlanbar } from '#/shared/noten/notenwert.ts';
import { notensystemForKlassenstufe } from '#/shared/school/klassenstufe.ts';
import type { SampleLeistung, SamplePlan } from './sample-data.ts';
import { addDays, halbjahrKey, samplePlan } from './sample-data.ts';

/**
 * Gut zwei Schuljahre in Schritten von 13 Tagen, die jeden Monat und jeden
 * Wochentag treffen, dazu die Ränder der Halbjahre und ein Schalttag.
 */
const stichtage = [
  ...Array.from({ length: 60 }, (_, index) =>
    addDays('2026-08-01', index * 13),
  ),
  '2026-08-01',
  '2026-08-02',
  '2027-01-31',
  '2027-02-01',
  '2027-07-31',
  '2028-02-29',
];

/** Die belegten Fächer je Schuljahr, nachgerechnet aus den Wechseln des Plans. */
const activeFaecher = (plan: SamplePlan) => {
  const active = new Map<string, ReadonlySet<string>>();
  let taken: ReadonlyArray<string> = [];
  for (const year of plan.schoolYears) {
    taken = [
      ...taken.filter((fach) => !year.archivedFaecher.includes(fach)),
      ...year.addedFaecher.map((fach) => fach.shortName),
    ];
    active.set(year.schoolYear, new Set(taken));
  }
  return active;
};

const halbjahreOf = (plan: SamplePlan) =>
  new Map(
    plan.schoolYears.flatMap((year) =>
      year.halbjahre.map(
        (halbjahr) =>
          [halbjahrKey(halbjahr.schoolYear, halbjahr.half), halbjahr] as const,
      ),
    ),
  );

const isValidWert = (wert: number, system: 'sechser' | 'punkte') =>
  system === 'punkte'
    ? Number.isInteger(wert) && wert >= 0 && wert <= 15
    : wert >= 1 && wert <= 6;

describe.each(stichtage)('Beispieldaten zum %s', (today) => {
  const plan = samplePlan(today);
  const halbjahre = halbjahreOf(plan);
  const active = activeFaecher(plan);

  it('legt gültige Halbjahre und Gewichtungen an', () => {
    const all = [...halbjahre.values()];
    expect(all.length).toBeGreaterThanOrEqual(5);
    for (const halbjahr of all) {
      expect(() =>
        Schema.decodeUnknownSync(HalbjahrInput)(halbjahr),
      ).not.toThrow();
    }
    expect(
      all.some(
        (halbjahr) => halbjahr.startsOn <= today && today <= halbjahr.endsOn,
      ),
    ).toBe(true);
    for (const year of plan.schoolYears) {
      for (const fach of [...year.addedFaecher, ...year.changedFaecher]) {
        expect(() =>
          Schema.decodeUnknownSync(FachgewichtungSchema)(fach.gewichtung),
        ).not.toThrow();
      }
    }
  });

  it('datiert jede Leistung in ihr Halbjahr und auf ein belegtes Fach', () => {
    const keys = new Set<string>();
    for (const leistung of plan.leistungen) {
      const halbjahr = halbjahre.get(
        halbjahrKey(leistung.schoolYear, leistung.half),
      );
      expect(halbjahr).toBeDefined();
      expect(leistung.datum >= (halbjahr?.startsOn ?? '')).toBe(true);
      expect(leistung.datum <= (halbjahr?.endsOn ?? '')).toBe(true);
      expect(active.get(leistung.schoolYear)?.has(leistung.fach)).toBe(true);
      expect(keys.has(leistung.key)).toBe(false);
      keys.add(leistung.key);
    }
  });

  it('benotet nur Vergangenes, im Notensystem des Halbjahrs', () => {
    const systemOf = (leistung: SampleLeistung) =>
      notensystemForKlassenstufe(
        halbjahre.get(halbjahrKey(leistung.schoolYear, leistung.half))
          ?.klassenstufe ?? '9',
      );
    const pending = plan.leistungen.filter(
      (leistung) => leistung.wert === null,
    );
    expect(pending.filter((leistung) => !isPlanbar(leistung.kind))).toEqual([]);
    const invalid = plan.leistungen.filter(
      (leistung) =>
        leistung.wert !== null &&
        (leistung.datum >= today ||
          !isValidWert(leistung.wert, systemOf(leistung))),
    );
    expect(invalid).toEqual([]);
  });

  it('zeigt Noten in jedem vergangenen Halbjahr und Angekündigtes um heute', () => {
    const ungraded = [...halbjahre.values()]
      .filter((halbjahr) => halbjahr.endsOn < today)
      .flatMap((halbjahr) =>
        [...(active.get(halbjahr.schoolYear) ?? [])]
          .filter(
            (fach) =>
              !plan.leistungen.some(
                (leistung) =>
                  leistung.wert !== null &&
                  leistung.schoolYear === halbjahr.schoolYear &&
                  leistung.half === halbjahr.half &&
                  leistung.fach === fach,
              ),
          )
          .map((fach) => `${halbjahr.schoolYear}:${halbjahr.half}:${fach}`),
      );
    expect(ungraded).toEqual([]);
    const pending = plan.leistungen.filter(
      (leistung) => leistung.wert === null,
    );
    expect(pending.filter((leistung) => leistung.datum < today)).toHaveLength(
      1,
    );
    expect(
      pending.filter((leistung) => leistung.datum >= today).length,
    ).toBeGreaterThanOrEqual(5);
  });

  it('trägt höchstens einen Lerntag je Tag und Fach ein, gewidmet nur Leistungen desselben Fachs', () => {
    const days = new Set(plan.studyDays.map((day) => `${day.day}:${day.fach}`));
    expect(days.size).toBe(plan.studyDays.length);
    expect(plan.studyDays.filter((studyDay) => studyDay.day > today)).toEqual(
      [],
    );
    const misassigned = plan.studyDays.filter(
      (studyDay) =>
        studyDay.leistungKey !== null &&
        plan.leistungen.find((entry) => entry.key === studyDay.leistungKey)
          ?.fach !== studyDay.fach,
    );
    expect(misassigned).toEqual([]);
  });
});

describe('Beispieldaten im laufenden Halbjahr', () => {
  it('zeigt schon am zweiten Tag eines Halbjahrs Noten in jedem Fach', () => {
    const today = '2027-02-02';
    const plan = samplePlan(today);
    const graded = plan.leistungen.filter(
      (leistung) =>
        leistung.wert !== null &&
        leistung.schoolYear === '2026/27' &&
        leistung.half === 2,
    );
    expect(new Set(graded.map((leistung) => leistung.fach)).size).toBe(8);
  });

  it('hakt die zuletzt geschriebene Klausur ganz ab', () => {
    const plan = samplePlan('2026-11-07');
    const prepared = plan.leistungen.filter(
      (leistung) => leistung.wert !== null && leistung.preparation !== null,
    );
    expect(prepared).toHaveLength(1);
    expect(prepared[0]?.kind).toBe('klausur');
    expect(prepared[0]?.preparation).not.toContain('- [ ]');
  });
});
