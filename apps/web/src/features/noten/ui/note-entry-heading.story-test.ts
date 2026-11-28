import { expect, test as it } from '@playwright/test';
import { chooser } from './noten-list.story-locators.ts';

const phone = { width: 320, height: 640 };
const story = 'features/noten/ui/noten-list-voll/Voll';
const newNote = /Neue Note in/u;
const faecher = [
  { id: 'kunst', name: 'Kunst' },
  // One word of this name is wider than the whole sheet at twice the text size.
  { id: 'nwt', name: 'Naturwissenschaft und Technik' },
];

for (const theme of ['light', 'dark'] as const) {
  for (const { id, name } of faecher) {
    it(`reach another Fach from a new Note in ${name} on a phone in ${theme}`, async ({
      mount,
      page,
    }) => {
      await page.setViewportSize(phone);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      const component = await mount(story);
      // Mounting loads the gallery afresh, so a style added before it would be lost.
      await page.addStyleTag({ content: 'html {font-size:32px}' });
      await component.locator(`[data-add-note="${id}"]`).click();
      const heading = component.getByRole('heading', {
        name: `Neue Note in ${name}`,
      });
      const link = component.getByRole('button', { name: 'Anderes Fach' });
      const widths = await heading.evaluate((element) => ({
        column: element.clientWidth,
        content: element.scrollWidth,
      }));
      expect(widths.content).toBeLessThanOrEqual(widths.column);
      const boxes = await Promise.all([
        heading.boundingBox(),
        link.boundingBox(),
      ]);
      for (const box of boxes) {
        expect(box?.width).toBeGreaterThan(0);
        expect(box?.x).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
          phone.width,
        );
      }
      // At this size the pinned bars leave only a strip of the sheet free, and
      // Playwright's own scrolling leaves the link behind one of them.
      const pinned = await component
        .getByRole('navigation', { name: 'Fächer dieser Seite' })
        .boundingBox();
      await link.evaluate(
        (element, top) =>
          scrollBy({
            behavior: 'instant',
            top: element.getBoundingClientRect().top - top,
          }),
        (pinned?.y ?? 0) + (pinned?.height ?? 0),
      );
      await link.click();
      await expect(chooser(component)).toBeVisible();
    });
  }
}

it('keep the link on screen where it shares a row with a long Fach name', async ({
  mount,
  page,
}) => {
  const width = 400;
  await page.setViewportSize({ width, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const component = await mount(
    'features/noten/ui/noten-bench/NeuMitLangemNamen',
  );
  await page.addStyleTag({ content: 'html {font-size:20px}' });
  const heading = component.getByRole('heading', { name: newNote });
  await expect(heading).toBeVisible();
  // The fallback font is narrower, so it would fit where the real one doesn't.
  await page.evaluate(() => document.fonts.ready);
  const headingBox = await heading.boundingBox();
  const linkBox = await component
    .getByRole('button', { name: 'Anderes Fach' })
    .boundingBox();
  // Beside the heading, not under it: the row is the layout under test.
  expect(linkBox?.x).toBeGreaterThanOrEqual(
    (headingBox?.x ?? 0) + (headingBox?.width ?? 0),
  );
  expect((linkBox?.x ?? 0) + (linkBox?.width ?? 0)).toBeLessThanOrEqual(width);
});

it('keep the link beside the heading at the normal text size', async ({
  mount,
  page,
}) => {
  await page.setViewportSize(phone);
  const component = await mount(story);
  await component.locator('[data-add-note="nwt"]').click();
  const headingBox = await component
    .getByRole('heading', { name: newNote })
    .boundingBox();
  const linkBox = await component
    .getByRole('button', { name: 'Anderes Fach' })
    .boundingBox();
  expect(linkBox?.x).toBeGreaterThan(
    (headingBox?.x ?? 0) + (headingBox?.width ?? 0),
  );
});
