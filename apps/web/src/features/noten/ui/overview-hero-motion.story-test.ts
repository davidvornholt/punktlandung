import { expect, test as it } from '@playwright/test';

/** How the dots of the Übersicht's hero move when the day the Verlauf shows changes. */
const story = 'features/noten/ui/overview-hero/Verlauf';

const fixture = {
  noten: 12,
  /** Milliseconds into a dot's landing, while it still fades in. */
  fadingAt: 20,
  /** Milliseconds after which a dot has finished the rest of its fade. */
  fadedAt: 200,
  /** How many times slower than a desktop a phone works, as Chrome slows the page down. */
  slowPhone: 4,
} as const;

const dot = '[data-part="hero-dot"]';

it('lässt einen Punkt weiter einblenden, wenn die nächste Note landet, bevor er ganz zu sehen ist', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const component = await mount(story);
  const slider = component.getByRole('slider');
  const first = component.locator(dot).first();
  // Holds the first dot's animations at `time` and tells the opacity it is seen with.
  const holdAt = (time: number) =>
    first.evaluate((node, at) => {
      for (const animation of node.getAnimations()) {
        if (!(animation instanceof CSSTransition)) {
          animation.pause();
          animation.currentTime = at;
        }
      }
      return Number(getComputedStyle(node).opacity);
    }, time);

  await slider.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('1');
  const fading = await holdAt(fixture.fadingAt);
  expect(fading).toBeLessThan(1);

  // The first dot's landing is held, so a landing that started over would show at once.
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('2');
  expect(
    await first.evaluate((node) => Number(getComputedStyle(node).opacity)),
  ).toBeCloseTo(fading, 2);
  await page.keyboard.press('Home');
  await expect(slider).toHaveValue('0');
  // The dot leaves from the opacity it was seen with and fades out to the stylesheet's.
  expect(await holdAt(0)).toBeCloseTo(fading, 2);
  await holdAt(fixture.fadedAt);
  await expect
    .poll(() =>
      first.evaluate((node) => Number(getComputedStyle(node).opacity)),
    )
    .toBe(0);
});

it('lässt einen Punkt nicht weiter landen, wenn die Bewegung mitten im Landen abgeschaltet wird', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const component = await mount(story);
  const slider = component.getByRole('slider');
  const first = component.locator(dot).first();
  // The animations of the first dot, other than the stylesheet's transitions.
  const landing = () =>
    first.evaluate(
      (node) =>
        node
          .getAnimations()
          .filter((animation) => !(animation instanceof CSSTransition)).length,
    );

  await slider.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('1');
  await first.evaluate((node) => {
    for (const animation of node.getAnimations()) {
      animation.pause();
    }
  });
  expect(await landing()).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('2');
  expect(await landing()).toBe(0);
});

it('zieht einen Punkt auf dem Weg zu seinem Platz nie größer, als ein Punkt sein kann', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const component = await mount(story);
  const slider = component.getByRole('slider');
  const geometry = () =>
    component
      .locator(dot)
      .evaluateAll((nodes) =>
        nodes
          .map((node) =>
            ['cx', 'cy', 'r'].map((name) => node.getAttribute(name)).join(),
          )
          .join(' '),
      );
  const today = await geometry();
  // Alone, the first Note is the whole Schnitt, so it has the radius of the heaviest dot on any day.
  await slider.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('1');
  const largest = Number(
    await component.locator(dot).first().getAttribute('r'),
  );
  // On a slow phone a frame begins well before the day it draws was chosen.
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', {
    rate: fixture.slowPhone,
  });
  try {
    await page.evaluate(() => {
      const record = { largest: 0 };
      Object.assign(globalThis, { record });
      const look = () => {
        for (const node of document.querySelectorAll(
          '[data-part="hero-dots"] circle',
        )) {
          record.largest = Math.max(
            record.largest,
            Number(node.getAttribute('r')),
          );
        }
        requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });
    for (let step = 1; step < fixture.noten; step += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: The days must follow each other, as they do when a key is held.
      await page.keyboard.press('ArrowRight');
    }
    await expect(slider).toHaveValue(`${fixture.noten}`);
    // Back on today, every dot comes to rest exactly where it was.
    await expect.poll(geometry).toBe(today);
    const seen = await page.evaluate(
      () => (globalThis as unknown as { record: { largest: number } }).record,
    );
    expect(seen.largest).toBeLessThanOrEqual(largest);
  } finally {
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
});
