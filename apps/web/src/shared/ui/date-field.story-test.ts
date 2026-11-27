import { expect, test as it } from '@playwright/test';

const story = 'shared/ui/date-field/Default';

/** The field's name is its label followed by the date it holds. */
const fieldName = /^Datum/u;

it('says the date in words and opens a calendar on the chosen day', async ({
  mount,
}) => {
  const component = await mount(story);
  const field = component.getByRole('button', { name: fieldName });
  await expect(field).toHaveText('Sa 28.11.2026 · in 2 Tagen');
  await field.click();
  const calendar = component.getByRole('dialog', { name: 'Datum wählen' });
  await expect(calendar.getByText('November 2026')).toBeVisible();
  await expect(
    calendar.getByRole('button', { name: 'Samstag, 28. November 2026' }),
  ).toBeFocused();
});

it('moves through days and months with the arrow keys', async ({
  mount,
  page,
}) => {
  const component = await mount(story);
  await component.getByRole('button', { name: fieldName }).click();
  const calendar = component.getByRole('dialog', { name: 'Datum wählen' });
  await page.keyboard.press('ArrowDown');
  await expect(calendar.getByText('Dezember 2026')).toBeVisible();
  await expect(
    calendar.getByRole('button', { name: 'Samstag, 5. Dezember 2026' }),
  ).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(calendar).toHaveCount(0);
  const field = component.getByRole('button', { name: fieldName });
  await expect(field).toHaveText('Fr 04.12.2026 · in 8 Tagen');
  await expect(field).toBeFocused();
  await expect(component.locator('input[name="datum"]')).toHaveValue(
    '2026-12-04',
  );
});

it('closes on Escape and offers no day outside the range', async ({
  mount,
  page,
}) => {
  const component = await mount(story);
  const field = component.getByRole('button', { name: fieldName });
  await field.click();
  const calendar = component.getByRole('dialog', { name: 'Datum wählen' });
  await calendar.getByRole('button', { name: 'Vorheriger Monat' }).click();
  await calendar.getByRole('button', { name: 'Vorheriger Monat' }).click();
  await expect(calendar.getByText('September 2026')).toBeVisible();
  await expect(
    calendar.getByRole('button', { name: 'Sonntag, 13. September 2026' }),
  ).toBeDisabled();
  await expect(
    calendar.getByRole('button', { name: 'Montag, 14. September 2026' }),
  ).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(calendar).toHaveCount(0);
  await expect(field).toBeFocused();
  await expect(field).toHaveText('Sa 28.11.2026 · in 2 Tagen');
});
