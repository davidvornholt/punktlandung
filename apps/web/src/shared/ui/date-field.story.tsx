import { useState } from 'react';
import { DateField } from './date-field.tsx';

const today = '2026-11-26';

export const Default = () => {
  const [value, setValue] = useState('2026-11-28');
  return (
    <div className="max-w-xs p-4">
      <DateField
        label="Datum"
        max="2027-01-31"
        min="2026-09-14"
        name="datum"
        onChange={setValue}
        today={today}
        value={value}
      />
    </div>
  );
};
