import { useEffect, useRef } from 'react';

type Fokusziel = {
  readonly isConnected: boolean;
  readonly focus: () => void;
};

export const stelleFormularFokusWiederHer = (
  ausloeser: Fokusziel | null,
  ersatzAusloeser: Fokusziel | null,
) => {
  (ausloeser?.isConnected ? ausloeser : ersatzAusloeser)?.focus();
};

/**
 * Fokusführung für ein Formular, das über einen Auslöser geöffnet wird. Der
 * Ersatzauslöser fängt den Fokus auf, wenn der ursprüngliche Auslöser beim
 * Schließen nicht mehr im Dokument steht; sein Elementtyp ist wählbar, weil
 * nicht jede Ansicht einen bleibenden Knopf anbietet.
 */
export const useFormularFokus = <
  Ersatz extends HTMLElement = HTMLButtonElement,
>(
  formularKennung: string | null,
) => {
  const formularRef = useRef<HTMLFormElement>(null);
  const ausloeserRef = useRef<HTMLElement | null>(null);
  const ersatzAusloeserRef = useRef<Ersatz>(null);
  const warOffenRef = useRef(false);

  useEffect(() => {
    if (formularKennung !== null) {
      formularRef.current
        ?.querySelector<HTMLElement>('input, select, textarea, button')
        ?.focus();
    } else if (warOffenRef.current) {
      stelleFormularFokusWiederHer(
        ausloeserRef.current,
        ersatzAusloeserRef.current,
      );
    }
    warOffenRef.current = formularKennung !== null;
  }, [formularKennung]);

  return {
    formularRef,
    ersatzAusloeserRef,
    merkeAusloeser: (ausloeser: HTMLElement) => {
      ausloeserRef.current = ausloeser;
    },
  };
};
