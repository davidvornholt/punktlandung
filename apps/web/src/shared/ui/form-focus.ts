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

export const useFormFocus = (formKey: string | null) => {
  const formRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const fallbackTriggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (formKey !== null) {
      formRef.current
        ?.querySelector<HTMLElement>('input, select, textarea, button')
        ?.focus();
    } else if (wasOpenRef.current) {
      restoreFormFocus(triggerRef.current, fallbackTriggerRef.current);
    }
    wasOpenRef.current = formKey !== null;
  }, [formKey]);

  return {
    formRef,
    fallbackTriggerRef,
    rememberTrigger: (trigger: HTMLElement) => {
      triggerRef.current = trigger;
    },
  };
};
