import { expect, test as it } from '@playwright/experimental-ct-react';
import type { Locator } from '@playwright/test';

import { HalbjahreManagementStory } from './halbjahre-management.ct-story.tsx';

const rowNamed = (component: Locator, name: string) =>
  component.getByRole('listitem').filter({ hasText: name });

const startDeletion = async (row: Locator) => {
  await row.getByRole('button', { name: 'Löschen' }).click();
  await row.getByRole('button', { name: 'Wirklich löschen' }).click();
  await expect(
    row.getByRole('button', { name: 'Wird gelöscht …' }),
  ).toBeDisabled();
};

const completeDeletion = (component: Locator) =>
  component.getByTestId('complete-deletion').dispatchEvent('click');

it('closes a same-row editor before restoring deletion focus', async ({
  mount,
}) => {
  const component = await mount(
    <HalbjahreManagementStory scenario="same-row" />,
  );
  const targetRow = rowNamed(component, '10.1');
  await targetRow.getByRole('button', { name: 'Bearbeiten' }).click();
  await expect(
    component.getByRole('heading', { name: 'Halbjahr bearbeiten' }),
  ).toBeVisible();

  await startDeletion(targetRow);
  await completeDeletion(component);

  await expect(
    component.getByRole('heading', { name: 'Halbjahr bearbeiten' }),
  ).toHaveCount(0);
  await expect(
    rowNamed(component, 'J1.1').getByRole('button', { name: 'Bearbeiten' }),
  ).toBeFocused();
});

it('preserves an edited value when the user moves focus during deletion', async ({
  mount,
}) => {
  const component = await mount(<HalbjahreManagementStory scenario="next" />);
  await startDeletion(rowNamed(component, '10.1'));
  await rowNamed(component, 'J1.1')
    .getByRole('button', { name: 'Bearbeiten' })
    .click();
  const gradeLevel = component.getByRole('combobox', {
    name: 'Klassenstufe',
  });
  await gradeLevel.selectOption('J2');

  await completeDeletion(component);

  await expect(gradeLevel).toHaveValue('J2');
  await expect(gradeLevel).toBeFocused();
});

it('refreshes a stale consequence and requires confirmation again', async ({
  mount,
}) => {
  const component = await mount(<HalbjahreManagementStory scenario="stale" />);
  const targetRow = rowNamed(component, '10.1');
  await startDeletion(targetRow);
  await component.getByTestId('reject-stale-deletion').dispatchEvent('click');

  await expect(targetRow.getByRole('alert')).toContainText(
    'Das Halbjahr ist inzwischen das letzte Halbjahr dieses Schuljahrs.',
  );
  await expect(rowNamed(component, '10.2')).toHaveCount(0);
  await targetRow.getByRole('button', { name: 'Löschen' }).click();
  await expect(targetRow).toContainText('konfigurierten Fächer');
  await targetRow.getByRole('button', { name: 'Wirklich löschen' }).click();
  await completeDeletion(component);
  await expect(targetRow).toHaveCount(0);
});

it('reflows the destructive confirmation at 320 CSS pixels', async ({
  mount,
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 320 });
  const component = await mount(<HalbjahreManagementStory scenario="single" />);
  await rowNamed(component, '10.1')
    .getByRole('button', { name: 'Löschen' })
    .click();

  await expect(rowNamed(component, '10.1')).toContainText(
    'konfigurierten Fächer',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
