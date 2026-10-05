import { expect, test as it } from '@playwright/experimental-ct-react';
import {
  KlassenstufeConflictStory,
  KlassenstufeCorrectionStory,
  PendingFormStory,
} from './halbjahr-form.ct-story.tsx';

it('retains submit focus and blocks duplicate saves and cancellation while pending', async ({
  mount,
}) => {
  const component = await mount(<PendingFormStory />);

  const submit = component.getByRole('button', { name: 'Halbjahr speichern' });
  await submit.focus();
  await submit.press('Enter');
  await expect(
    component.getByRole('button', { name: 'Halbjahr wird gespeichert' }),
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

it('names the Klassenstufe of the other Halbjahr and blocks saving a different one', async ({
  mount,
}) => {
  const component = await mount(<KlassenstufeConflictStory />);
  const klassenstufe = component.getByRole('combobox', {
    name: 'Klassenstufe',
  });
  const submit = component.getByRole('button', { name: 'Halbjahr speichern' });

  await expect(klassenstufe).toHaveValue('10');
  await expect(component.getByRole('alert')).toHaveCount(0);

  await klassenstufe.selectOption('J1');
  await expect(component.getByRole('alert')).toHaveText(
    'Das 1. Halbjahr 2026/27 gehört zur Klasse 10. Beide Halbjahre eines Schuljahrs haben dieselbe Klassenstufe; wähle auch hier Klasse 10.',
  );
  await expect(submit).toHaveAttribute('aria-disabled', 'true');
  await component.locator('form').dispatchEvent('submit');
  await expect(
    component.getByRole('status', { name: 'Save calls' }),
  ).toHaveText('0');

  await klassenstufe.selectOption('10');
  await expect(component.getByRole('alert')).toHaveCount(0);
  await submit.click();
  await expect(
    component.getByRole('status', { name: 'Save calls' }),
  ).toHaveText('1');
});

it('announces that a corrected Klassenstufe also applies to the other Halbjahr and saves it', async ({
  mount,
}) => {
  const component = await mount(<KlassenstufeCorrectionStory />);
  const klassenstufe = component.getByRole('combobox', {
    name: 'Klassenstufe',
  });
  const correction = component
    .getByRole('status')
    .filter({ hasText: 'Die Klassenstufe gilt' });

  await expect(klassenstufe).toHaveValue('10');
  await expect(correction).toHaveCount(0);

  await klassenstufe.selectOption('9');
  await expect(correction).toHaveText(
    'Die Klassenstufe gilt für das ganze Schuljahr. Beim Speichern wechselt auch das 1. Halbjahr 2026/27 zu Klasse 9.',
  );
  await expect(component.getByRole('alert')).toHaveCount(0);
  await component.getByRole('button', { name: 'Halbjahr speichern' }).click();
  await expect(component.getByRole('status', { name: 'Saved' })).toHaveText(
    '9 2026/27',
  );

  await component
    .getByRole('combobox', { name: 'Schuljahr' })
    .selectOption('2027/28');
  await expect(correction).toHaveCount(0);
});
