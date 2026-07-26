import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

import type {
  HalbjahrDeletionFocusOwnership,
  HalbjahrDeletionRequest,
} from './halbjahr-deletion-model.ts';
import {
  captureHalbjahrDeletionFocus,
  halbjahrDeletionSuccessMessage,
  restoreHalbjahrDeletionFocus,
} from './halbjahr-deletion-model.ts';

export const useHalbjahrDeletionFocusCapture = () => {
  const ownershipRef = useRef<HalbjahrDeletionFocusOwnership | null>(null);
  useEffect(
    () => () => {
      ownershipRef.current?.release();
    },
    [],
  );
  return (trigger: HTMLButtonElement) => {
    ownershipRef.current?.release();
    const ownership = captureHalbjahrDeletionFocus(trigger);
    ownershipRef.current = ownership;
    return ownership;
  };
};

export const useHalbjahrDeletionCompletion = (
  formRef: RefObject<HTMLFormElement | null>,
  createTriggerRef: RefObject<HTMLButtonElement | null>,
) => {
  const [status, setStatus] = useState<{
    readonly message: string;
    readonly sequence: number;
  } | null>(null);
  const completedRequestRef = useRef<HalbjahrDeletionRequest | null>(null);
  useEffect(() => {
    if (status === null) {
      return;
    }
    const request = completedRequestRef.current;
    if (request !== null) {
      restoreHalbjahrDeletionFocus({
        adjacentTarget: request.adjacentFocusTarget,
        createTrigger: createTriggerRef.current,
        focusOwnership: request.focusOwnership,
        formControl:
          formRef.current?.querySelector<HTMLElement>(
            'input, select, textarea, button',
          ) ?? null,
      });
      completedRequestRef.current = null;
    }
  }, [createTriggerRef, formRef, status]);
  return {
    complete: (request: HalbjahrDeletionRequest) => {
      completedRequestRef.current = request;
      setStatus((current) => ({
        message: halbjahrDeletionSuccessMessage(request.halbjahr),
        sequence: (current?.sequence ?? 0) + 1,
      }));
    },
    message: status?.message ?? '',
  };
};
