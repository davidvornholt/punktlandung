import { describe, expect, it, mock } from 'bun:test';

import { restoreFormFocus } from './form-focus.ts';

const focusTarget = (isConnected: boolean) => ({
  focus: mock(() => undefined),
  isConnected,
});

describe('restoreFormFocus', () => {
  it('behält den Fokus auf einem verbundenen Schuljahr-Select statt auf dem alten Formularauslöser', () => {
    const schoolYearOptions = focusTarget(true);
    const previousTrigger = focusTarget(true);

    restoreFormFocus(schoolYearOptions, previousTrigger);

    expect(schoolYearOptions.focus).toHaveBeenCalledTimes(1);
    expect(previousTrigger.focus).not.toHaveBeenCalled();
  });

  it('nutzt den Ersatzauslöser, wenn das ursprüngliche Ziel entfernt wurde', () => {
    const removedTrigger = focusTarget(false);
    const replacementTrigger = focusTarget(true);

    restoreFormFocus(removedTrigger, replacementTrigger);

    expect(removedTrigger.focus).not.toHaveBeenCalled();
    expect(replacementTrigger.focus).toHaveBeenCalledTimes(1);
  });
});
