import { useEffect, useRef } from 'react';

export const useFormularFokus = (formularKennung: string | null) => {
  const formularRef = useRef<HTMLFormElement>(null);
  const ausloeserRef = useRef<HTMLButtonElement | null>(null);
  const ersatzAusloeserRef = useRef<HTMLButtonElement>(null);
  const warOffenRef = useRef(false);

  useEffect(() => {
    if (formularKennung !== null) {
      formularRef.current
        ?.querySelector<HTMLElement>('input, select, textarea, button')
        ?.focus();
    } else if (warOffenRef.current) {
      const ausloeser = ausloeserRef.current;
      (ausloeser?.isConnected
        ? ausloeser
        : ersatzAusloeserRef.current
      )?.focus();
    }
    warOffenRef.current = formularKennung !== null;
  }, [formularKennung]);

  return {
    formularRef,
    ersatzAusloeserRef,
    merkeAusloeser: (ausloeser: HTMLButtonElement) => {
      ausloeserRef.current = ausloeser;
    },
  };
};
