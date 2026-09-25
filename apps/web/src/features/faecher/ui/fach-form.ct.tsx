import { expect, test as it } from '@playwright/experimental-ct-react';
import { PendingFormStory } from './fach-form.ct-story.tsx';

it('retains submit focus and blocks duplicate saves and cancellation while pending', async ({
  mount,
}) => {
  const component = await mount(<PendingFormStory />);
  await component
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('Latein');
  await component.getByRole('textbox', { name: 'Kürzel' }).fill('L');
  const submit = component.getByRole('button', { name: 'Fach speichern' });
  await submit.focus();
  await submit.press('Enter');
  await expect(
    component.getByRole('button', { name: 'Fach wird gespeichert' }),
  ).toBeFocused();
  await expect(
    component.getByRole('button', { name: 'Abbrechen' }),
  ).toBeDisabled();
  await component.locator('form').dispatchEvent('submit');
  await expect(
    component.getByRole('status', { name: 'Save calls' }),
  ).toHaveText('1');
  await component.getByTestId('fail').dispatchEvent('click');
  await expect(submit).toBeFocused();
  await expect(component.getByRole('alert')).toHaveText('Verbindung weg');
});
