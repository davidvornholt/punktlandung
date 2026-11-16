import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { clampIsoDate } from '#/shared/date/date-range.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { actionErrorText } from '#/shared/ui/action-error.ts';
import type { NotenFields } from '../schemas/note-schema.ts';
import { NoteForm } from './note-form.tsx';
import { createSubmissionIds } from './note-submission.ts';
import { invalidateNotenQueries } from './noten-invalidation.ts';
import type { NotenOperations } from './noten-operations.ts';

/** Die Eintragsleiste: eine Note direkt nach der Rückgabe erfassen. */
export const NoteEntryBar = ({
  halbjahr,
  faecher,
  operations,
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
  readonly operations: NotenOperations;
}) => {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [submissionIds] = useState(createSubmissionIds);
  const createMutation = useMutation({
    mutationFn: (values: NotenFields) =>
      operations.create({
        ...values,
        id: submissionIds.idFor(halbjahr.id, values),
        termId: halbjahr.id,
      }),
    onSuccess: () => {
      submissionIds.settle();
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
