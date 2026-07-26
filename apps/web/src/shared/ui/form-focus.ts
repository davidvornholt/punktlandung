import { useEffect, useRef } from 'react';

type FocusTarget = {
  readonly isConnected: boolean;
  readonly focus: () => void;
};

export const restoreFormFocus = (
  trigger: FocusTarget | null,
  fallbackTrigger: FocusTarget | null,
) => {
  (trigger?.isConnected ? trigger : fallbackTrigger)?.focus();
};

/**
 * Fokusführung für ein Formular, das über einen Auslöser geöffnet wird. Der
 * Ersatzauslöser fängt den Fokus auf, wenn der ursprüngliche Auslöser beim
 * Schließen nicht mehr im Dokument steht; sein Elementtyp ist wählbar, weil
 * nicht jede Ansicht einen bleibenden Knopf anbietet.
 */
export const useFormFocus = <Fallback extends HTMLElement = HTMLButtonElement>(
  formKey: string | null,
) => {
  const formRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const fallbackTriggerRef = useRef<Fallback>(null);
  const suppressRestoreRef = useRef(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (formKey !== null) {
      formRef.current
        ?.querySelector<HTMLElement>('input, select, textarea, button')
        ?.focus();
    } else if (wasOpenRef.current && !suppressRestoreRef.current) {
      restoreFormFocus(triggerRef.current, fallbackTriggerRef.current);
    }
    suppressRestoreRef.current = false;
    wasOpenRef.current = formKey !== null;
  }, [formKey]);

  return {
    formRef,
    fallbackTriggerRef,
    rememberTrigger: (trigger: HTMLElement) => {
      triggerRef.current = trigger;
    },
    suppressNextRestore: () => {
      suppressRestoreRef.current = true;
    },
  };
};
