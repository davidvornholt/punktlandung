import { describe, expect, it, mock } from 'bun:test';

import {
  findAdjacentHalbjahrEditTrigger,
  restoreHalbjahrDeletionFocus,
} from './halbjahr-deletion-model.ts';

const deferredCompletion = () => {
  let complete = (): void => undefined;
  const completed = new Promise<void>((resolve) => {
    complete = resolve;
  });
  return { complete, completed };
};

describe('Halbjahr deletion focus destination', () => {
  it('chooses the next row, then the previous row, for focus restoration', () => {
    const nextEditTrigger = {} as HTMLButtonElement;
    const previousEditTrigger = {} as HTMLButtonElement;
    const row = {
      nextElementSibling: {
        querySelector: mock(() => nextEditTrigger),
      },
      previousElementSibling: {
        querySelector: mock(() => previousEditTrigger),
      },
    };
    const deletionTrigger = {
      closest: mock(() => row),
    } as unknown as HTMLButtonElement;

    expect(findAdjacentHalbjahrEditTrigger(deletionTrigger)).toBe(
      nextEditTrigger,
    );
    row.nextElementSibling = null as never;
    expect(findAdjacentHalbjahrEditTrigger(deletionTrigger)).toBe(
      previousEditTrigger,
    );
  });

  it('prefers an open form control when the deleted row has no neighbor', () => {
    const deletionTrigger = {} as HTMLButtonElement;
    const formControl = {
      focus: mock(() => undefined),
      isConnected: true,
      value: '2027/28',
    } as unknown as HTMLInputElement;
    const createTrigger = {
      focus: mock(() => undefined),
      isConnected: true,
    } as unknown as HTMLButtonElement;

    restoreHalbjahrDeletionFocus({
      activeElement: deletionTrigger,
      adjacentTarget: null,
      createTrigger,
      deletionTrigger,
      formControl,
    });

    expect(formControl.focus).toHaveBeenCalledTimes(1);
    expect(formControl.value).toBe('2027/28');
    expect(createTrigger.focus).not.toHaveBeenCalled();
  });
});

describe('Halbjahr deletion focus ownership', () => {
  it('restores focus after deferred completion while deletion still owns it', async () => {
    const deletionTrigger = {} as HTMLButtonElement;
    const adjacent = {
      focus: mock(() => undefined),
      isConnected: true,
    } as unknown as HTMLButtonElement;
    const fallback = {
      focus: mock(() => undefined),
      isConnected: true,
    } as unknown as HTMLButtonElement;
    const completion = deferredCompletion();
    const result = completion.completed.then(() =>
      restoreHalbjahrDeletionFocus({
        activeElement: deletionTrigger,
        adjacentTarget: adjacent,
        createTrigger: fallback,
        deletionTrigger,
        formControl: null,
      }),
    );

    completion.complete();

    expect(await result).toBeTrue();
    expect(adjacent.focus).toHaveBeenCalledTimes(1);
    expect(fallback.focus).not.toHaveBeenCalled();
  });

  it('does not steal focus moved during a pending deletion', async () => {
    const deletionTrigger = {} as HTMLButtonElement;
    const movedFocus = {} as HTMLInputElement;
    const adjacent = {
      focus: mock(() => undefined),
      isConnected: true,
    } as unknown as HTMLButtonElement;
    let activeElement: Element | null = deletionTrigger;
    const completion = deferredCompletion();
    const result = completion.completed.then(() =>
      restoreHalbjahrDeletionFocus({
        activeElement,
        adjacentTarget: adjacent,
        createTrigger: null,
        deletionTrigger,
        formControl: null,
      }),
    );

    activeElement = movedFocus;
    completion.complete();

    expect(await result).toBeFalse();
    expect(adjacent.focus).not.toHaveBeenCalled();
  });
});
