import { expect, test as it } from '@playwright/experimental-ct-react';
import type { Locator } from '@playwright/test';

import { HalbjahreManagementStory } from './halbjahre-management.ct-story.tsx';

const rowNamed = (component: Locator, name: string) =>
  component.getByRole('listitem').filter({ hasText: name });

const confirmDeletion = async (row: Locator) => {
  await row.getByRole('button', { name: 'Löschen' }).click();
  await expect(row).toContainText('Das leere Halbjahr wird entfernt.');
  await row.getByRole('button', { name: 'Wirklich löschen' }).click();
  await expect(
    row.getByRole('button', { name: 'Wird gelöscht …' }),
  ).toBeDisabled();
};

const completeDeletion = (component: Locator) =>
  component.getByTestId('complete-deletion').dispatchEvent('click');

it('confirms twice, disables natively, removes and reorders, then announces success', async ({
  mount,
  page,
}) => {
  const component = await mount(<HalbjahreManagementStory scenario="next" />);
  const targetRow = rowNamed(component, '10.1');

  await targetRow.getByRole('button', { name: 'Löschen' }).click();
  await expect(targetRow).toContainText(
    'Da es das letzte Halbjahr im Schuljahr 2026/27 ist',
  );
  await expect(targetRow).toContainText('Wirklich löschen');
  await targetRow.getByRole('button', { name: 'Wirklich löschen' }).click();
  await expect(
    targetRow.getByRole('button', { name: 'Wird gelöscht …' }),
  ).toBeDisabled();
  await expect(
    rowNamed(component, 'J1.1').getByRole('button', { name: 'Löschen' }),
  ).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName))
    .toBe('BODY');

  await completeDeletion(component);

  await expect(targetRow).toHaveCount(0);
  await expect(component.getByRole('heading', { level: 3 })).toHaveText([
    'J1.1',
    'J1.2',
  ]);
  await expect(
    rowNamed(component, 'J1.1').getByRole('button', { name: 'Bearbeiten' }),
  ).toBeFocused();
  await expect(component.getByRole('status')).toHaveText(
    'Halbjahr 10.1 (2026/27) wurde gelöscht.',
  );
});

it('falls back to the previous row when the final row is removed', async ({
  mount,
}) => {
  const component = await mount(
    <HalbjahreManagementStory scenario="previous" />,
  );

  await confirmDeletion(rowNamed(component, '10.1'));
  await completeDeletion(component);

  await expect(
    rowNamed(component, 'J1.2').getByRole('button', { name: 'Bearbeiten' }),
  ).toBeFocused();
});

it('falls back to create after the last row is removed', async ({ mount }) => {
  const component = await mount(<HalbjahreManagementStory scenario="single" />);

  await confirmDeletion(rowNamed(component, '10.1'));
  await completeDeletion(component);

  await expect(component.getByRole('listitem')).toHaveCount(0);
  await expect(
    component.getByRole('button', { name: 'Halbjahr anlegen' }),
  ).toBeFocused();
});

it('preserves an open create form and uses its first control as fallback', async ({
  mount,
}) => {
  const component = await mount(<HalbjahreManagementStory scenario="single" />);
  await component.getByRole('button', { name: 'Halbjahr anlegen' }).click();
  await component
    .getByRole('button', { name: 'Zeitraum abweichend festlegen' })
    .click();
  const startsOn = component.getByRole('textbox', { name: 'Beginn' });
  await startsOn.fill('2026-09-03');

  await confirmDeletion(rowNamed(component, '10.1'));
  await completeDeletion(component);

  await expect(
    component.getByRole('heading', { name: 'Neues Halbjahr' }),
  ).toBeVisible();
  await expect(startsOn).toHaveValue('2026-09-03');
  await expect(
    component.getByRole('combobox', { name: 'Klassenstufe' }),
  ).toBeFocused();
});
