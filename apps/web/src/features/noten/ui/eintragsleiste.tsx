import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { berlinKalenderdatum } from '#/shared/datum/kalenderdatum.ts';
import { begrenzeIsoDatum } from '#/shared/datum/zeitraum.ts';
import type { Notensystem } from '#/shared/noten/notenwert.ts';
import { aktionsfehlerText } from '#/shared/ui/aktionsfehler.ts';
import type { NotenFelder } from '../schemas/note-schema.ts';
import { createNoteFn } from '../server/noten-fns.ts';
import { NoteForm } from './note-form.tsx';
import { aktualisiereNotenAbfragen } from './noten-aktualisierung.ts';

/** Die Eintragsleiste: eine Note direkt nach der Rückgabe erfassen. */
export const Eintragsleiste = ({
  term,
  faecher,
}: {
  readonly term: {
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
  const eintragen = useMutation({
    mutationFn: (werte: NotenFelder) =>
      createNoteFn({ data: { ...werte, termId: term.id } }),
    onSuccess: () => {
      formRef.current?.reset();
      return aktualisiereNotenAbfragen(queryClient, term.id);
    },
  });

  return (
    <NoteForm
      beschaeftigt={eintragen.isPending}
      faecher={faecher}
      fehler={
        eintragen.isError
          ? aktionsfehlerText(
              eintragen.error,
              'Die Note konnte wegen eines technischen Fehlers nicht gespeichert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
            )
          : null
      }
      formularRef={formRef}
      note={null}
      onAbbrechen={null}
      onSpeichern={(werte) => {
        eintragen.reset();
        eintragen.mutate(werte);
      }}
      term={term}
      vorgabeDatum={begrenzeIsoDatum(
        berlinKalenderdatum(),
        term.startsOn,
        term.endsOn,
      )}
    />
  );
};
