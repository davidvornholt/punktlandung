import { describe, expect, it } from 'bun:test';
import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Leistung } from '../services/noten-service.ts';
import { fachRows } from './overview-faecher-model.ts';

const faecher = [
  { id: 'deutsch', name: 'Deutsch', gewichtung: standardgewichtung },
  { id: 'chemie', name: 'Chemie', gewichtung: standardgewichtung },
];

const base = {
  datum: '2026-10-12',
  fachId: 'deutsch',
  fachKuerzel: 'D',
  fachName: 'Deutsch',
  gewicht: 1,
  gewichtung: standardgewichtung,
  kind: 'klausur' as const,
  notiz: null,
};

const leistungen: ReadonlyArray<Leistung> = [
  { ...base, id: 'd1', status: 'graded', wert: 12 },
  { ...base, id: 'd2', datum: '2026-11-02', status: 'graded', wert: 9 },
  { ...base, id: 'd3', datum: '2026-12-12', status: 'planned' },
  {
    ...base,
    id: 'l1',
    fachId: 'latein',
    fachKuerzel: 'L',
    fachName: 'Latein',
    status: 'graded',
    wert: 7,
  },
];

const rows = fachRows({
  faecher,
  leistungen,
  system: 'punkte',
  today: '2026-11-26',
});

describe('fachRows', () => {
  it('führt jedes Fach des Schuljahrs und danach archivierte mit Leistungen', () => {
    expect(rows.map((row) => row.name)).toEqual([
      'Deutsch',
      'Chemie',
      'Latein',
    ]);
  });

  it('trennt den Fachschnitt in Zahl und Einheit', () => {
    expect(rows[0]?.schnitt).toEqual({ figure: '10,5', fill: '', unit: 'P.' });
    expect(rows[1]?.schnitt).toBeNull();
    const [sechser] = fachRows({
      faecher,
      leistungen: [{ ...base, id: 'd1', status: 'graded', wert: 2.25 }],
      system: 'sechser',
      today: '2026-11-26',
    });
    expect(sechser?.schnitt).toEqual({ figure: '2,25', fill: '', unit: null });
  });

  it('füllt jede Zahl auf die längste Nachkommastelle auf, damit die Kommas untereinanderstehen', () => {
    // Latein hat 7 P., Deutsch 10,5 P.: Der 7 fehlt „,5“.
    expect(rows[2]?.schnitt).toEqual({ figure: '7', fill: ',5', unit: 'P.' });
    const filled = fachRows({
      faecher,
      leistungen: [
        { ...base, id: 'd1', status: 'graded', wert: 10 },
        { ...base, id: 'd2', status: 'graded', wert: 11 },
        { ...base, id: 'c1', fachId: 'chemie', status: 'graded', wert: 12.33 },
      ],
      system: 'punkte',
      today: '2026-11-26',
    });
    expect(filled.map((row) => row.schnitt?.fill)).toEqual(['3', '']);
  });

  it('legt die Leistungen des Fachs als Scheiben auf seine Skala', () => {
    expect(rows[0]?.ruler.model.points.map((point) => point.id)).toEqual([
      'd1',
      'd2',
      'd3',
    ]);
    expect(rows[0]?.ruler.model.fulcrum).toBe(10.5);
    expect(rows[1]?.ruler.model.points).toEqual([]);
  });

  it('sagt, was die Zeile nicht druckt: Anzahl und Ausstehendes', () => {
    expect(rows.map((row) => row.detail)).toEqual([
      'aus 2 Noten, 1 ausstehend',
      'noch keine Note',
      'aus 1 Note',
    ]);
  });
});
