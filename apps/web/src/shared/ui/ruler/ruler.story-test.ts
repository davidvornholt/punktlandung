import { expect, test as it } from '@playwright/test';

/** What the Physik fixture of the stories holds. */
const physik = {
  discs: 5,
  discsAfterSaving: 6,
  steps: 16,
  /** Clicks land this far above the bar's bottom edge, inside the bar. */
  insideBar: 10,
} as const;

it('names the figure and draws every Note as a disc', async ({ mount }) => {
  const component = await mount('shared/ui/ruler/ruler/Bench');
  const figure = component.getByRole('img', {
    name: 'Physik: Noten auf der Skala',
  });
  await expect(figure).toBeVisible();
  await expect(figure.locator('[data-part="disc"]')).toHaveCount(physik.discs);
  await expect(figure.locator('[data-look="missing"]')).toHaveCount(1);
  await expect(figure.locator('[data-part="fulcrum-value"]')).toHaveText(
    '10,33 P.',
  );
});

it('lets a Note be chosen on the bar with the keyboard', async ({
  mount,
  page,
}) => {
  const component = await mount('shared/ui/ruler/ruler/Entry');
  const choice = component.getByRole('group', {
    name: 'Notenpunkte auf der Skala wählen',
  });
  await expect(choice.getByRole('radio')).toHaveCount(physik.steps);
  await choice.getByRole('radio', { name: '12 Notenpunkte' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await expect(
    choice.getByRole('radio', { name: '13 Notenpunkte' }),
  ).toBeChecked();
  await expect(component.locator('[data-part="held-text"]')).toHaveText(
    '13 P.',
  );
});

it('lets a Note be chosen with the pointer and lands it when it is saved', async ({
  mount,
  page,
}) => {
  const component = await mount('shared/ui/ruler/ruler/Entry');
  const column = component
    .getByRole('radio', { name: '14 Notenpunkte' })
    .locator('..');
  const box = await column.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(
    (box?.x ?? 0) + (box?.width ?? 0) / 2,
    (box?.y ?? 0) + (box?.height ?? 0) - physik.insideBar,
  );
  await expect(
    component.getByRole('radio', { name: '14 Notenpunkte' }),
  ).toBeChecked();
  // The press leaves the keyboard on the value it chose.
  await page.keyboard.press('ArrowLeft');
  await expect(
    component.getByRole('radio', { name: '13 Notenpunkte' }),
  ).toBeChecked();

  await component.getByRole('button', { name: 'Note eintragen' }).click();
  await expect(component.getByRole('radio')).toHaveCount(0);
  await expect(component.locator('[data-part="disc"]')).toHaveCount(
    physik.discsAfterSaving,
  );
  await expect(component.locator('[data-part="fulcrum-value"]')).toHaveText(
    '11 P.',
  );
});
