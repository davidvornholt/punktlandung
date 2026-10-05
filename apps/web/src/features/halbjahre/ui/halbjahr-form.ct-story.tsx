import { useRef, useState } from 'react';
import { HalbjahrForm } from './halbjahr-form.tsx';
export const PendingFormStory = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calls, setCalls] = useState(0);
  return (
    <div>
      <HalbjahrForm
        title="Halbjahr bearbeiten"
        halbjahr={null}
        halbjahre={[]}
        today="2026-09-25"
        pending={pending}
        error={error}
        formRef={formRef}
        onCancel={() => undefined}
        onSave={() => {
          setCalls((count) => count + 1);
          setPending(true);
        }}
      />
      <output aria-label="Save calls">{calls}</output>
      <button
        hidden={true}
        type="button"
        data-testid="fail"
        onClick={() => {
          setPending(false);
          setError('Verbindung weg');
        }}
      >
        Fail
      </button>
    </div>
  );
};

const erstesHalbjahr = {
  endsOn: '2027-01-31',
  half: 1,
  id: 'erstes',
  klassenstufe: '10',
  schoolYear: '2026/27',
  startsOn: '2026-08-01',
  system: 'sechser',
} as const;

const zweitesHalbjahr = {
  ...erstesHalbjahr,
  endsOn: '2027-07-31',
  half: 2,
  id: 'zweites',
  startsOn: '2027-02-01',
} as const;

/** Das 1. Halbjahr 2026/27 steht schon als Klasse 10 fest. */
export const KlassenstufeConflictStory = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [calls, setCalls] = useState(0);
  return (
    <div>
      <HalbjahrForm
        title="Neues Halbjahr"
        halbjahr={null}
        halbjahre={[erstesHalbjahr]}
        today="2026-09-25"
        pending={false}
        error={null}
        formRef={formRef}
        onCancel={() => undefined}
        onSave={() => setCalls((count) => count + 1)}
      />
      <output aria-label="Save calls">{calls}</output>
    </div>
  );
};

/** Beide Halbjahre 2026/27 stehen als Klasse 10 fest; das 2. wird bearbeitet. */
export const KlassenstufeCorrectionStory = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState<string>('');
  return (
    <div>
      <HalbjahrForm
        title="Halbjahr bearbeiten"
        halbjahr={zweitesHalbjahr}
        halbjahre={[erstesHalbjahr, zweitesHalbjahr]}
        today="2026-09-25"
        pending={false}
        error={null}
        formRef={formRef}
        onCancel={() => undefined}
        onSave={(values) =>
          setSaved(`${values.klassenstufe} ${values.schoolYear}`)
        }
      />
      <output aria-label="Saved">{saved}</output>
    </div>
  );
};
