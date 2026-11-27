import { useState } from 'react';
import { primaryButtonClass, secondaryButtonClass } from '../form-classes.ts';
import type { RulerModel, RulerPoint } from './geometry.ts';
import { Ruler } from './ruler.tsx';

const today = '2026-11-26';

type Sample = Pick<RulerPoint, 'id' | 'value' | 'date' | 'note'> &
  Partial<Pick<RulerPoint, 'kind' | 'state'>>;

const disc = (sample: Sample): RulerPoint => ({
  mass: 0,
  kind: 'schriftlich',
  state: sample.value === null ? 'pending' : 'graded',
  tip: sample.note,
  ...sample,
});

/** Shares the Schnitt evenly among the discs that have a Note, and puts the fulcrum under their mean. */
const balanced = (points: ReadonlyArray<RulerPoint>): RulerModel => {
  const graded = points.filter((point) => point.value !== null);
  const share = 1 / Math.max(1, graded.length);
  const total = graded.reduce((sum, point) => sum + (point.value ?? 0), 0);
  return {
    caption: 'Fachschnitt',
    fulcrum: graded.length === 0 ? null : total / graded.length,
    points: points.map((point) => ({ ...point, mass: share })),
  };
};

const physik: ReadonlyArray<RulerPoint> = [
  { id: 'klausur-1', value: 11, date: '2026-09-28', note: 'Klausur · 28.09.' },
  {
    id: 'muendlich',
    value: 9,
    date: '2026-10-30',
    note: 'Mündlich · 30.10.',
    kind: 'muendlich' as const,
  },
  { id: 'test', value: 11, date: '2026-11-05', note: 'Test · 05.11.' },
  {
    id: 'gfs',
    value: null,
    date: '2026-11-12',
    note: 'GFS\nNote fehlt',
    state: 'missing' as const,
  },
  {
    id: 'klausur-2',
    value: null,
    date: '2026-12-08',
    note: 'Klausur\nin 12 Tagen',
  },
].map(disc);

const mathe: ReadonlyArray<RulerPoint> = [
  { id: 'a', value: 2.25, date: '2025-10-02', note: 'Klassenarbeit · 02.10.' },
  { id: 'b', value: 3.5, date: '2025-11-12', note: 'Klassenarbeit · 12.11.' },
  {
    id: 'c',
    value: 1.75,
    date: '2025-12-01',
    note: 'Mündlich · 01.12.',
    kind: 'muendlich' as const,
  },
].map(disc);

/** One disc per Fach on its Halbjahresnote; `origin` is the Schnitt it was rounded from. */
const halbjahresnoten: ReadonlyArray<RulerPoint> = [
  { id: 'D', value: 11, origin: 10.7 },
  { id: 'M', value: 13, origin: 12.6 },
  { id: 'E', value: 11, origin: 11.4 },
  { id: 'Ph', value: 10, origin: 10.33 },
  { id: 'G', value: 9, origin: 9.2 },
  { id: 'Sp', value: 9, origin: 8.5 },
].map((sample) => ({
  ...sample,
  mass: 1,
  kind: 'fach',
  state: 'graded',
  date: sample.id,
  text: sample.id,
}));

const zeugnisSchnitt = 10.5;

export const Bench = ({
  points = physik,
}: {
  readonly points?: ReadonlyArray<RulerPoint>;
}) => (
  <Ruler
    label="Physik: Noten auf der Skala"
    model={balanced(points)}
    system="punkte"
    today={today}
    variant="bench"
  />
);

export const Focused = () => (
  <Ruler
    dimension={{ id: 'muendlich', text: '1,33 P. unter dem Fachschnitt' }}
    label="Physik: Noten auf der Skala"
    model={balanced(
      physik.map((point) => ({
        ...point,
        focus: point.id === 'muendlich',
        dim: point.id !== 'muendlich',
      })),
    )}
    system="punkte"
    today={today}
    variant="bench"
  />
);

export const Row = () => (
  <Ruler
    label="Physik: Schnitt 10,33 P."
    model={balanced(physik)}
    system="punkte"
    today={today}
    variant="row"
  />
);

export const Sechser = () => (
  <Ruler
    label="Mathematik: Noten auf der Skala"
    model={balanced(mathe)}
    system="sechser"
    today={today}
    variant="bench"
  />
);

export const Zeugnis = () => (
  <Ruler
    label="Halbjahresnoten aller Fächer"
    model={{
      caption: 'Schnitt aller Halbjahresnoten',
      fulcrum: zeugnisSchnitt,
      points: halbjahresnoten,
    }}
    system="punkte"
    today={today}
    variant="zeugnis"
  />
);

/** Entering a Note on the bar: choose a value, save it, and the disc lands. */
export const Entry = () => {
  const [points, setPoints] = useState(physik);
  const [value, setValue] = useState<number | null>(null);
  const [open, setOpen] = useState(true);
  const [landingId, setLandingId] = useState<string | null>(null);
  const model = balanced(points);
  const graded = points.filter((point) => point.value !== null);
  const sum = graded.reduce((total, point) => total + (point.value ?? 0), 0);
  const id = `neu-${points.length}`;
  return (
    <div>
      <Ruler
        candidate={
          open
            ? {
                value,
                date: today,
                mass: 1 / (graded.length + 1),
                kind: 'schriftlich',
                fulcrum:
                  value === null ? null : (sum + value) / (graded.length + 1),
                replaces: null,
                text: value === null ? 'noch offen' : `${value} P.`,
              }
            : null
        }
        entering={open}
        label="Physik: Noten auf der Skala"
        landingId={landingId}
        model={model}
        picker={
          open
            ? {
                legend: 'Notenpunkte auf der Skala wählen',
                name: 'wert',
                onChange: setValue,
                value,
                valueLabel: (step) => `${step} Notenpunkte`,
              }
            : null
        }
        system="punkte"
        today={today}
        variant="bench"
      />
      <div className="mt-4 flex gap-2">
        <button
          className={primaryButtonClass}
          onClick={() => {
            setLandingId(id);
            setPoints([
              ...points,
              disc({ id, value, date: today, note: `Test · ${id}` }),
            ]);
            setOpen(false);
          }}
          type="button"
        >
          Note eintragen
        </button>
        <button
          className={secondaryButtonClass}
          onClick={() => {
            setValue(null);
            setOpen(true);
          }}
          type="button"
        >
          Weitere Note
        </button>
        <button
          className={secondaryButtonClass}
          onClick={() => setPoints(points.slice(0, -1))}
          type="button"
        >
          Letzte löschen
        </button>
      </div>
    </div>
  );
};
