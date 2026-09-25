import { useRef, useState } from 'react';
import { FachForm } from './fach-form.tsx';
export const PendingFormStory = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calls, setCalls] = useState(0);
  return (
    <div>
      <FachForm
        title="Fach bearbeiten"
        fach={null}
        system="sechser"
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
