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
