import { expect, test as it } from '@playwright/experimental-ct-react';
import {
  editForm,
  firstRow,
  openEditor,
  save,
  secondRow,
  settle,
} from './noten-list.ct-locators.ts';
import { NotenListStory } from './noten-list.ct-story.tsx';

it('keeps save focus while pending and after failure', async ({ mount }) => {
  const component = await mount(<NotenListStory />);
  await openEditor(firstRow(component));
  const submit = editForm(component).getByRole('button', {
    name: 'Note speichern',
  });
  await submit.focus();
  await submit.press('Enter');
  await expect(
    editForm(component).getByRole('button', { name: 'Note wird gespeichert' }),
  ).toBeFocused();
  await expect(
    editForm(component).getByRole('button', { name: 'Abbrechen' }),
  ).toBeDisabled();
  await settle(component, 'fail');
  await expect(submit).toBeFocused();
  await expect(editForm(component).getByRole('alert')).toBeVisible();
});

it('retains the first deletion failure when a second deletion starts', async ({
  mount,
}) => {
  const component = await mount(<NotenListStory />);
  await firstRow(component).getByRole('button', { name: 'Löschen' }).click();
  await settle(component, 'fail');
  await expect(firstRow(component).getByRole('alert')).toBeVisible();
  await secondRow(component).getByRole('button', { name: 'Löschen' }).click();
  await expect(firstRow(component).getByRole('alert')).toBeVisible();
  await settle(component, 'complete');
  await expect(firstRow(component).getByRole('alert')).toBeVisible();
});

it('keeps an earlier save pending after a later save finishes', async ({
  mount,
}) => {
  const component = await mount(<NotenListStory />);
  await openEditor(firstRow(component));
  await save(component);
  await openEditor(secondRow(component));
  await save(component);
  await component.getByTestId('complete-b').dispatchEvent('click');
  await expect(editForm(component)).toHaveCount(0);
  await openEditor(firstRow(component));
  await expect(
    editForm(component).getByRole('button', { name: 'Abbrechen' }),
  ).toBeDisabled();
  await component.getByTestId('complete-a').dispatchEvent('click');
  await expect(editForm(component)).toHaveCount(0);
});

it('returns focus to the list after a successful retry', async ({ mount }) => {
  const component = await mount(<NotenListStory scenario="retry" />);
  const retry = component.getByRole('button', { name: 'Erneut versuchen' });
  await retry.focus();
  await retry.press('Enter');
  await expect(firstRow(component)).toBeVisible();
  await expect(
    component.getByRole('region', { name: 'Notenliste' }),
  ).toBeFocused();
});
