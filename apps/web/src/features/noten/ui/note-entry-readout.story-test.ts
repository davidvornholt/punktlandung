import type * as playwright from '@playwright/test';
import { expect, test as it } from '@playwright/test';

const sentence = /Danach steht Kunst bei/u;

/** Enters a Note in Kunst on the narrowest phone and returns the sentence about it. */
const enterNote = async (component: playwright.Locator) => {
  await component.locator('[data-add-note="kunst"]').click();
  await component.getByRole('button', { name: 'Ein Notenpunkt mehr' }).click();
  return {
    figure: component.locator('output[form]'),
    hint: component.getByText(sentence),
  };
};

for (const theme of ['light', 'dark'] as const) {
  it(`read the grade preview on a phone in ${theme}`, async ({
    mount,
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    const component = await mount('features/noten/ui/noten-list-voll/Voll');
    // Mounting loads the gallery afresh, so a style added before it would be lost.
    await page.addStyleTag({ content: 'html {font-size:32px}' });
    const { hint } = await enterNote(component);
    const widths = await hint.evaluate((element) => ({
      column: element.clientWidth,
      content: element.scrollWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.column);
  });
}

it('keep the grade preview beside the figure at the normal text size', async ({
  mount,
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const { figure, hint } = await enterNote(
    await mount('features/noten/ui/noten-list-voll/Voll'),
  );
  const figureBox = await figure.boundingBox();
  const hintBox = await hint.boundingBox();
  expect(hintBox?.x).toBeGreaterThan(
    (figureBox?.x ?? 0) + (figureBox?.width ?? 0),
  );
});
