import { describe, expect, it, mock } from 'bun:test';

import { restoreFormFocus } from '#/shared/ui/form-focus.ts';
import { changeSchoolYear } from './school-year-change.ts';

describe('changeSchoolYear', () => {
  it('behält beim Schuljahrwechsel mit offenem Formular den Fokus auf dem Select', () => {
    const schoolYearSelect = {
      focus: mock(() => undefined),
      isConnected: true,
      value: '2026/27',
    } as unknown as HTMLSelectElement;
    const replacementTrigger = {
      focus: mock(() => undefined),
      isConnected: true,
    } as unknown as HTMLButtonElement;
    let returnTarget: HTMLElement | null = null;
    const rememberTrigger = mock((trigger: HTMLElement) => {
      returnTarget = trigger;
    });
    const closeEditor = mock(() => {
      restoreFormFocus(returnTarget, replacementTrigger);
    });
    const setSchoolYear = mock((_schoolYear: string) => undefined);

    changeSchoolYear(
      schoolYearSelect,
      { rememberTrigger },
      { setEditTarget: closeEditor, setSchoolYear },
    );

    expect(rememberTrigger).toHaveBeenCalledWith(schoolYearSelect);
    expect(closeEditor).toHaveBeenCalledTimes(1);
    expect(setSchoolYear).toHaveBeenCalledWith('2026/27');
    expect(schoolYearSelect.focus).toHaveBeenCalledTimes(1);
    expect(replacementTrigger.focus).not.toHaveBeenCalled();
  });
});
