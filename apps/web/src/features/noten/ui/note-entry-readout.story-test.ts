import type * as playwright from '@playwright/test';
import { expect, test as it } from '@playwright/test';

const sentence = /Danach steht Kunst bei/u;
const phone = { width: 320, height: 640 };

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
    await page.setViewportSize(phone);
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
    // A sentence that fits its own column can still lie beside the screen.
    const box = await hint.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(phone.width);
  });
}

it('keep the grade preview beside the figure at the normal text size', async ({
  mount,
  page,
}) => {
  await page.setViewportSize(phone);
  const { figure, hint } = await enterNote(
    await mount('features/noten/ui/noten-list-voll/Voll'),
  );
  const figureBox = await figure.boundingBox();
  const hintBox = await hint.boundingBox();
  expect(hintBox?.x).toBeGreaterThan(
    (figureBox?.x ?? 0) + (figureBox?.width ?? 0),
  );
});
