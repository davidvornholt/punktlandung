import { expect, test as it } from '@playwright/test';
import {
  cancelButton,
  chooseNote,
  deleteRow,
  entryForm,
  firstRow,
  list,
  noteOnBar,
  openEditor,
  otherFachRow,
  save,
  saveButton,
  secondRow,
  settle,
} from './noten-list.story-locators.ts';

it('keeps save focus while pending and after failure', async ({ mount }) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await openEditor(firstRow(component));
  const submit = saveButton(component);
  await submit.focus();
  await submit.press('Enter');
  const saving = entryForm(component).getByRole('button', {
    name: 'Wird gespeichert …',
  });
  await expect(saving).toBeFocused();
  await expect(saving).toHaveAttribute('aria-disabled', 'true');
  await expect(cancelButton(component)).toBeDisabled();
  await settle(component, 'fail');
  await expect(submit).toBeFocused();
  await expect(entryForm(component).getByRole('alert')).toBeVisible();
});

it('retains the first deletion failure when a second deletion starts', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await deleteRow(firstRow(component));
  await settle(component, 'fail');
  await expect(firstRow(component).getByRole('alert')).toBeVisible();
  await deleteRow(secondRow(component));
  await expect(firstRow(component).getByRole('alert')).toBeVisible();
  await settle(component, 'complete');
  await expect(secondRow(component)).toHaveCount(0);
  await expect(firstRow(component).getByRole('alert')).toBeVisible();
});

/** The Latein Note is still on its way when the Mathematik one is saved and done. */
it('keeps an earlier save pending after a later save finishes', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await openEditor(firstRow(component));
  await save(component);
  await openEditor(otherFachRow(component));
  await save(component);
  await component.getByTestId('complete-c').dispatchEvent('click');
  await expect(entryForm(component)).toHaveCount(0);
  await openEditor(firstRow(component));
  await expect(cancelButton(component)).toBeDisabled();
  await component.getByTestId('complete-a').dispatchEvent('click');
  await expect(entryForm(component)).toHaveCount(0);
});

it('returns focus to the list after a successful retry', async ({ mount }) => {
  const component = await mount('features/noten/ui/noten-list/Retry');
  const retry = component.getByRole('button', { name: 'Erneut versuchen' });
  await retry.focus();
  await retry.press('Enter');
  await expect(firstRow(component)).toBeVisible();
  await expect(list(component)).toBeFocused();
});

it('keeps an open entry when a background refresh fails', async ({ mount }) => {
  const component = await mount(
    'features/noten/ui/noten-list/NeuladenScheitert',
  );
  await openEditor(firstRow(component));
  await chooseNote(component, 'Note 4');
  await component.getByTestId('refetch').dispatchEvent('click');
  await expect(component.getByRole('alert')).toBeVisible();
  await expect(noteOnBar(component, 'Note 4')).toBeChecked();
});

it('returns focus to the list after a successful refresh retry', async ({
  mount,
}) => {
  const component = await mount(
    'features/noten/ui/noten-list/NeuladenScheitert',
  );
  await component.getByTestId('refetch').dispatchEvent('click');
  const retry = component.getByRole('button', { name: 'Erneut versuchen' });
  await retry.focus();
  await retry.press('Enter');
  await component.getByTestId('finish-read').dispatchEvent('click');
  await expect(component.getByRole('alert')).toHaveCount(0);
  await expect(list(component)).toBeFocused();
});

it('keeps focus in the entry when a refresh retry finishes later', async ({
  mount,
}) => {
  const component = await mount(
    'features/noten/ui/noten-list/NeuladenScheitert',
  );
  await openEditor(firstRow(component));
  await component.getByTestId('refetch').dispatchEvent('click');
  const retry = component.getByRole('button', { name: 'Erneut versuchen' });
  await retry.focus();
  await retry.press('Enter');
  const onBar = noteOnBar(component, 'Note 2');
  await onBar.focus();
  await component.getByTestId('finish-read').dispatchEvent('click');
  await expect(component.getByRole('alert')).toHaveCount(0);
  await expect(onBar).toBeFocused();
});
