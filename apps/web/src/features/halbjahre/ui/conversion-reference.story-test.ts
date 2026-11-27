import type * as playwright from '@playwright/test';
import { expect, test as it } from '@playwright/test';

import { conversionTable } from '#/shared/noten/conversion-table.ts';

/** The Notenpunkte 14 to 0 each have an official Notentendenz on the bar of Noten; a phone's bar names those of the whole Noten. */
const marks = { wide: 15, phone: 6 } as const;
const phone = { width: 390, height: 844 } as const;

const story = 'features/halbjahre/ui/conversion-reference/Default';
const barOfNoten =
  'Skala der Noten 6 bis 1 mit den Notenpunkten 0 bis 14 an den amtlichen Stellen';

const rowWithHeader = (component: playwright.Locator, header: string) =>
  component.getByRole('rowheader', { name: header, exact: true }).locator('..');

it('distinguishes official and interpolated rows accessibly', async ({
  mount,
}) => {
  const component = await mount(story);
  await component.getByText('Umrechnungstabelle', { exact: true }).click();
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
  const component = await mount(story);
  const disclosure = component.locator('details');
  const summary = component.getByText('Umrechnungstabelle', {
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

it('draws both scales and names them', async ({ mount }) => {
  const component = await mount(story);
  await expect(
    component.getByRole('heading', { name: 'Zwei Skalen, eine Richtung' }),
  ).toBeVisible();
  await expect(
    component.getByRole('img', {
      name: 'Skala der Notenpunkte 0 bis 15 mit den Noten 6 bis 1 an der unteren Kante',
    }),
  ).toBeVisible();
  const noten = component.getByRole('img', { name: barOfNoten });
  await expect(noten).toBeVisible();
  // Along the lower edge from 6 on the left to 1 on the right: 0 P. to 14 P.
  const edge = noten.locator('[data-mark="notenpunkte"]');
  await expect(edge).toHaveCount(marks.wide);
  await expect(edge.first()).toHaveText('14');
  await expect(edge.last()).toHaveText('0');
  await expect(
    component.getByText('Kursstufe: oben Notenpunkte, unten Noten'),
  ).toBeVisible();
  await expect(
    component.getByText('Klassen 5 bis 10: oben Noten, unten Notenpunkte'),
  ).toBeVisible();
});

it('fits a phone and names fewer Notenpunkte there', async ({
  mount,
  page,
}) => {
  await page.setViewportSize(phone);
  const component = await mount(story);
  const noten = component.getByRole('img', { name: barOfNoten });
  await expect(noten.locator('[data-mark="notenpunkte"]')).toHaveText([
    '14',
    '11',
    '8',
    '5',
    '2',
    '0',
  ]);
  await expect(noten.locator('[data-mark="notenpunkte"]')).toHaveCount(
    marks.phone,
  );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
