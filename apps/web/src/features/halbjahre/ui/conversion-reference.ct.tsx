import { expect, test as it } from '@playwright/experimental-ct-react';
import type { Locator } from '@playwright/test';

import { conversionTable } from '#/shared/noten/conversion-table.ts';

import { ConversionReference } from './conversion-reference.tsx';

const rowWithHeader = (component: Locator, header: string) =>
  component.getByRole('rowheader', { name: header, exact: true }).locator('..');

it('distinguishes official and interpolated rows accessibly', async ({
  mount,
}) => {
  const component = await mount(<ConversionReference />);
  await component
    .getByText('Umrechnungstabelle anzeigen', { exact: true })
    .click();
  const officialRow = rowWithHeader(component, '1,25 (1-)');
  const interpolatedRow = rowWithHeader(component, '1,5 (1-2)');

  await expect(officialRow.getByRole('cell')).toHaveAccessibleName('13 P.');
  await expect(officialRow.locator('[aria-hidden="true"]')).toHaveCount(0);

  await expect(interpolatedRow.getByRole('cell')).toHaveAccessibleName(
    '12,5 P. (interpoliert)',
  );
  await expect(interpolatedRow.locator('[aria-hidden="true"]')).toHaveText(
    '≈ ',
  );
  await expect(interpolatedRow.locator('.sr-only')).toHaveText(
    ' (interpoliert)',
  );
});

it('preserves the native disclosure and scoped table headers', async ({
  mount,
  page,
}) => {
  const component = await mount(<ConversionReference />);
  const disclosure = component.locator('details');
  const summary = component.getByText('Umrechnungstabelle anzeigen', {
    exact: true,
  });

  await expect(disclosure).not.toHaveAttribute('open', '');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');
  await page.keyboard.press('Space');
  await expect(disclosure).not.toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');

  await expect(component.locator('caption')).toHaveText(
    'Dezimalnoten mit ihrer Notentendenz und ihren Notenpunkten, von 1+ bis 6',
  );
  const columnHeaders = component.getByRole('columnheader');
  await expect(columnHeaders).toHaveText(['Note', 'Notenpunkte']);
  await expect(columnHeaders.nth(0)).toHaveAttribute('scope', 'col');
  await expect(columnHeaders.nth(1)).toHaveAttribute('scope', 'col');

  const rowHeaders = component.getByRole('rowheader');
  await expect(rowHeaders).toHaveCount(conversionTable.length);
  expect(
    await rowHeaders.evaluateAll((headers) =>
      headers.every((header) => header.getAttribute('scope') === 'row'),
    ),
  ).toBe(true);
});
