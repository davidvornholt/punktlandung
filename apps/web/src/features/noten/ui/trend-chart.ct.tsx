import { expect, test as it } from '@playwright/experimental-ct-react';
import { TrendChart } from './trend-chart';

const entries = [
  {
    datum: '2026-09-14',
    fachKuerzel: 'M',
    fachName: 'Mathematik',
    punkte: 11,
    schnitt: 11,
    notenwert: 11,
    notensystem: 'punkte',
    leistungsart: 'klausur',
    klassenstufe: 'J1',
    half: 1,
  },
  {
    datum: '2026-09-21',
    fachKuerzel: 'D',
    fachName: 'Deutsch',
    punkte: 7,
    schnitt: 9,
    notenwert: 7,
    notensystem: 'punkte',
    leistungsart: 'gfs',
    klassenstufe: 'J1',
    half: 1,
  },
] as const;
it.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
});

it('a normal tap pins the intended point, outside taps and Escape dismiss it, and scrolling remains native', async ({
  mount,
  page,
}, testInfo) => {
  const component = await mount(
    <div className="min-h-[1600px] p-6">
      <h1>Notenverlauf</h1>
      <TrendChart entries={entries} />
      <button type="button">Außerhalb</button>
    </div>,
  );
  await page.addStyleTag({ content: 'body { min-height: 1600px; }' });
  const dots = component.locator('.recharts-line-dot');
  await expect(dots).toHaveCount(entries.length);
  await dots.nth(1).tap();
  const selected = component.getByRole('complementary', {
    name: 'Ausgewählte Note',
  });
  await expect(selected).toContainText('Deutsch');
  await expect(selected).toContainText('GFS');
  await expect(selected).toContainText('21.09.2026');
  await page.mouse.move(0, 0);
  await expect(selected).toBeVisible();
  await testInfo.attach('pinned-trend-point', {
    body: await page.screenshot({
      path: testInfo.outputPath('pinned-trend-point.png'),
    }),
    contentType: 'image/png',
  });
  await component.getByRole('button', { name: 'Außerhalb' }).tap();
  await expect(selected).toHaveCount(0);
  await dots.first().tap();
  await expect(selected).toContainText('Mathematik');
  await page.keyboard.press('Escape');
  await expect(selected).toHaveCount(0);
  await component
    .getByText('Notenpunkte als Tabelle anzeigen', { exact: true })
    .tap();
  await expect(component.getByRole('table')).toContainText('Deutsch');
  const box = await dots.first().boundingBox();
  if (!box) {
    throw new Error('The plotted point is missing.');
  }
  const cdp = await page.context().newCDPSession(page);
  const swipeX = 200;
  const swipeStart = 300;
  const swipeEnd = 150;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: swipeX, y: swipeStart }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: swipeX, y: swipeEnd }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
});
