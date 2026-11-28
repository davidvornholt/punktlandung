import { useState } from 'react';

import { standardgewichtung } from '#/shared/noten/fach-gewichtung.ts';
import type { Fachgewichtung, Notensystem } from '#/shared/noten/notenwert.ts';
import { secondaryButtonClass } from '#/shared/ui/form-classes.ts';
import type { NotenFields } from '../schemas/note-schema.ts';
import type { Leistung } from '../services/noten-service.ts';
import { NotenBench } from './noten-bench.tsx';

const today = '2026-11-26';

const wait = { save: 250 } as const;

const halbgewichtung: Fachgewichtung = {
  ...standardgewichtung,
  verhaeltnis: { schriftlich: 1, muendlich: 1 },
};

type Sample = Pick<Leistung, 'id' | 'kind' | 'datum'> & {
  readonly wert: number | null;
  readonly notiz?: string;
};

const leistungOf =
  (
    fach: { readonly id: string; readonly name: string },
    gewichtung: Fachgewichtung,
  ) =>
  ({ wert, notiz, ...sample }: Sample): Leistung => {
    const base = {
      ...sample,
      fachId: fach.id,
      fachKuerzel: fach.name.slice(0, 2),
      fachName: fach.name,
      gewicht: 1,
      gewichtung,
      notiz: notiz ?? null,
    };
    return wert === null
      ? { ...base, status: 'planned' }
      : { ...base, status: 'graded', wert };
  };

const physik = { id: 'physik', name: 'Physik', gewichtung: halbgewichtung };
const mathe = {
  id: 'mathe',
  name: 'Mathematik',
  gewichtung: standardgewichtung,
};

const physikNoten = [
  { id: 'test-1', kind: 'test', datum: '2026-10-20', wert: 11 },
  {
    id: 'klausur-1',
    kind: 'klausur',
    datum: '2026-11-23',
    wert: 13,
    notiz: 'Mechanik',
  },
  { id: 'test-2', kind: 'test', datum: '2026-12-20', wert: null },
] satisfies ReadonlyArray<Sample>;

const matheNoten = [
  { id: 'arbeit-1', kind: 'klausur', datum: '2025-10-02', wert: 2.25 },
  { id: 'arbeit-2', kind: 'klausur', datum: '2025-11-12', wert: 3.5 },
  { id: 'muendlich', kind: 'muendlich', datum: '2025-11-20', wert: 2 },
] satisfies ReadonlyArray<Sample>;

type Setup = {
  readonly fach: typeof physik;
  readonly leistungen: ReadonlyArray<Leistung>;
  readonly system: Notensystem;
  readonly today: string;
  /** The id of the Leistung the entry is for; `null` enters a new one. */
  readonly target: string | null;
  readonly fails?: boolean;
  readonly otherFach?: boolean;
};

const saved = (
  leistungen: ReadonlyArray<Leistung>,
  setup: Setup,
  values: NotenFields,
): { readonly id: string; readonly leistungen: ReadonlyArray<Leistung> } => {
  const id = setup.target ?? `neu-${leistungen.length}`;
  const next = leistungOf(
    setup.fach,
    setup.fach.gewichtung,
  )({
    id,
    kind: values.kind,
    datum: values.datum,
    wert: values.wert,
    ...(values.notiz === null ? {} : { notiz: values.notiz }),
  });
  return {
    id,
    leistungen: [...leistungen.filter((entry) => entry.id !== id), next],
  };
};

/** The bench with an open entry, saved the way the pages save it: the entry closes when the Leistung is there. */
const Harness = ({ setup }: { readonly setup: Setup }) => {
  const [leistungen, setLeistungen] = useState(setup.leistungen);
  const [open, setOpen] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [landingId, setLandingId] = useState<string | null>(null);
  const [log, setLog] = useState('');
  const target = leistungen.find((entry) => entry.id === setup.target) ?? null;
  const save = (values: NotenFields): void => {
    setPending(true);
    setError(null);
    setLog(JSON.stringify(values));
    setTimeout(() => {
      setPending(false);
      if (setup.fails === true) {
        setError(
          'Die Note konnte wegen eines technischen Fehlers nicht gespeichert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
        );
        return;
      }
      const result = saved(leistungen, setup, values);
      setLeistungen(result.leistungen);
      setLandingId(result.id);
      setOpen(false);
    }, wait.save);
  };
  return (
    <div className="p-5">
      <NotenBench
        entry={
          open
            ? {
                leistung: target,
                pending,
                error,
                onSave: save,
                onCancel: () => setOpen(false),
                ...(setup.otherFach === true
                  ? { onOtherFach: (draft) => setLog(JSON.stringify(draft)) }
                  : {}),
              }
            : null
        }
        fach={setup.fach}
        halbjahr={{
          system: setup.system,
          startsOn: setup.system === 'punkte' ? '2026-09-01' : '2025-09-01',
          endsOn: setup.system === 'punkte' ? '2027-01-31' : '2026-01-31',
        }}
        landingId={landingId}
        leistungen={leistungen}
        today={setup.today}
      >
        {({ bench, readout, form }) => (
          <div className="grid desk:grid-cols-[minmax(0,1fr)_30rem] desk:gap-x-12 gap-y-2">
            <div className="min-w-0">
              {bench}
              {readout}
            </div>
            <div className="min-w-0 desk:pt-2.5">{form}</div>
          </div>
        )}
      </NotenBench>
      <button
        className={`${secondaryButtonClass} mt-6`}
        onClick={() => {
          setLandingId(null);
          setOpen(true);
        }}
        type="button"
      >
        Wieder öffnen
      </button>
      <output className="mt-2 block text-ink-soft text-xs" data-testid="log">
        {log}
      </output>
    </div>
  );
};

const physikSetup: Setup = {
  fach: physik,
  leistungen: physikNoten.map(leistungOf(physik, physik.gewichtung)),
  system: 'punkte',
  today,
  target: null,
};

/** A new Note in a Fach that weighs schriftlich against mündlich. */
export const Neu = () => (
  <Harness setup={{ ...physikSetup, otherFach: true }} />
);

/** A new Note in a Fach whose name is one very long word. */
export const NeuMitLangemNamen = () => (
  <Harness
    setup={{
      ...physikSetup,
      fach: { ...physik, name: 'Wirtschaftswissenschaften' },
      otherFach: true,
    }}
  />
);

/** A Note that is there is changed. */
export const Aendern = () => (
  <Harness setup={{ ...physikSetup, target: 'klausur-1' }} />
);

/** The Note of a Leistung that was entered beforehand. */
export const Eintragen = () => (
  <Harness setup={{ ...physikSetup, target: 'test-2' }} />
);

export const Fehler = () => <Harness setup={{ ...physikSetup, fails: true }} />;

/** Quarter steps on the bar of the Sechsersystem. */
export const Sechser = () => (
  <Harness
    setup={{
      fach: mathe,
      leistungen: matheNoten.map(leistungOf(mathe, mathe.gewichtung)),
      system: 'sechser',
      today: '2025-11-26',
      target: null,
    }}
  />
);
