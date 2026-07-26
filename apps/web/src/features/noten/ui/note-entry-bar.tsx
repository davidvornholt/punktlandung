import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { clampIsoDate } from '#/shared/date/date-range.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import type { NotenFields } from '../schemas/note-schema.ts';
import { createNoteFn } from '../server/noten-fns.ts';
import { NoteForm } from './note-form.tsx';
import { invalidateNotenQueries } from './noten-invalidation.ts';

/** Die Eintragsleiste: eine Note direkt nach der Rückgabe erfassen. */
export const NoteEntryBar = ({
  halbjahr,
  faecher,
}: {
  readonly halbjahr: {
    readonly id: string;
    readonly system: Notensystem;
    readonly startsOn: string;
    readonly endsOn: string;
  };
  readonly faecher: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
}) => {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const createMutation = useMutation({
    mutationFn: (values: NotenFields) =>
      createNoteFn({ data: { ...values, termId: halbjahr.id } }),
    onSuccess: () => {
      formRef.current?.reset();
      return invalidateNotenQueries(queryClient, halbjahr.id);
    },
  });

  return (
    <NoteForm
      defaultDate={clampIsoDate(
        berlinCalendarDate(),
        halbjahr.startsOn,
        halbjahr.endsOn,
      )}
      error={
        createMutation.isError
          ? actionErrorText(
              createMutation.error,
              'Die Note konnte wegen eines technischen Fehlers nicht gespeichert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
            )
          : null
      }
      faecher={faecher}
      formRef={formRef}
      halbjahr={halbjahr}
      note={null}
      onCancel={null}
      onSave={(values) => {
        createMutation.reset();
        createMutation.mutate(values);
      }}
      pending={createMutation.isPending}
    />
  );
};
