import type * as playwright from '@playwright/test';
import { expect, test as it } from '@playwright/test';

const stories = 'features/halbjahre/ui/halbjahr-timeline';

const figure = (component: playwright.Locator) => component.getByRole('img');

/** How the summary ends when the form holds a Halbjahr over the line. */
const heldSentence = /Gestrichelt: J1\.2, wie es im Formular steht\.$/u;

/**
 * The texts of the figure that reach past its edge or into a text beside
 * them on the same line. Estimated widths place them, so the browser has the
 * last word.
 */
const misplacedTexts = (component: playwright.Locator) =>
  figure(component).evaluate((svg) => {
    const frame = svg.getBoundingClientRect();
    const texts = [...svg.querySelectorAll('text')].map((text) => ({
      box: text.getBoundingClientRect(),
      line: text.getAttribute('y'),
      text: text.textContent ?? '',
    }));
    const outside = texts.filter(
      ({ box }) =>
        Math.ceil(box.left) < Math.floor(frame.left) ||
        Math.floor(box.right) > Math.ceil(frame.right),
    );
    const touching = texts.filter(({ box, line }, index) =>
      texts.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.line === line &&
          other.box.left < box.right &&
          other.box.right > box.left,
      ),
    );
    return [...outside, ...touching].map(({ text }) => text);
  });

it('says the figure in words', async ({ mount }) => {
  const component = await mount(`${stories}/Laufbahn`);
  await expect(figure(component)).toHaveAccessibleName(
    'Zeitleiste der Halbjahre von August 2024 bis Juli 2027. 9.1, 9.2, 10.1, 10.2: Noten 1–6. J1.1: Notenpunkte 0–15. Aktuell ist J1.1.',
  );
  await expect(component.locator('figcaption')).toHaveText(
    'Rot: das aktuelle Halbjahr. Blasser: weiter zurück.',
  );
});

it('tells which Halbjahr the pointer is on and forgets it when the pointer leaves', async ({
  mount,
  page,
}) => {
  const component = await mount(`${stories}/Laufbahn`);
  const highlighted = component.getByRole('status', { name: 'Hervorgehoben' });
  await component.locator('rect[data-tip^="10.2 "]').hover();
  await expect(highlighted).toHaveText('10.2');
  await page.mouse.move(0, 0);
  await expect(highlighted).toHaveText('nichts');
});

it('draws the Halbjahr from the form lifted off the line and names it', async ({
  mount,
}) => {
  const component = await mount(`${stories}/MitFormular`);
  await expect(figure(component)).toHaveAccessibleName(heldSentence);
  const [held, current] = await Promise.all(
    ['J1.2 ', 'J1.1 '].map((label) =>
      component.locator(`rect[data-tip^="${label}"]`).getAttribute('y'),
    ),
  );
  expect(Number(held)).toBeLessThan(Number(current));
});

for (const story of ['Laufbahn', 'MitFormular', 'GanzeSchulzeit', 'Voraus']) {
  it(`keeps every text of ${story} inside the figure and apart at 320 CSS pixels`, async ({
    mount,
    page,
  }) => {
    await page.setViewportSize({ height: 720, width: 320 });
    const component = await mount(`${stories}/${story}`);
    await expect(figure(component)).toBeVisible();
    expect(await misplacedTexts(component)).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
