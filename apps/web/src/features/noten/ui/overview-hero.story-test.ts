import { expect, test as it } from '@playwright/test';

const story = 'features/noten/ui/overview-hero/Verlauf';

/** What the Verlauf fixture of the stories holds. */
const fixture = {
  noten: 12,
  current: 5,
  /** Columns of the table that says the same as the figures. */
  columns: 7,
  /** Longer than the sequence in which the twelve Noten land. */
  sequenceTimeout: 8000,
} as const;

const dot = '[data-part="hero-dot"]';

it('zeigt jede Note als Punkt und den Gesamtschnitt unter der Stütze', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const component = await mount(story);
  const figure = component.getByRole('img', {
    name: 'Alle 12 Noten als Punkte auf der Skala von 0 bis 15 Notenpunkten. Der Gesamtschnitt liegt bei 10,33 P.',
  });

  await expect(figure.locator(dot)).toHaveCount(fixture.noten);
  await expect(figure.locator(`${dot}[data-stratum="now"]`)).toHaveCount(
    fixture.current,
  );
  await expect(figure.locator(`${dot}[data-ring]`)).toHaveCount(1);
  await expect(figure).toContainText('10,33');
  await expect(figure).toContainText('entspricht Note 2,17');
  await expect(
    component.getByText('Alle 12 Noten seit Klasse 10.'),
  ).toBeVisible();
  await expect(
    component.getByRole('list', { name: 'Legende' }).getByRole('listitem'),
  ).toHaveText(['10.1', '10.2', 'J1.1', 'mündlich']);
});

it('dreht mit der Tastatur die Zeit zurück und mit „Heute“ wieder vor', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const component = await mount(story);
  const slider = component.getByRole('slider', {
    name: 'Verlauf: Stand nach einer Anzahl von Noten',
  });
  const heute = component.getByRole('button', { name: 'Heute' });

  await expect(slider).toHaveAttribute(
    'aria-valuetext',
    'Heute: 12 Noten, Gesamtschnitt 10,33 P. Zuletzt: Mathematik, Klausur, 10 P.',
  );
  await expect(heute).toBeDisabled();

  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveAttribute(
    'aria-valuetext',
    '30.10.2026: 10 Noten, Gesamtschnitt 10,17 P. Zuletzt: Deutsch, Mündlich, 9 P.',
  );
  await expect(component.getByText('Stand am 30.10.2026')).toBeVisible();
  await expect(component.locator(`${dot}[data-away]`)).toHaveCount(2);
  await expect(component.getByRole('img')).toContainText('10,17');

  await page.keyboard.press('Home');
  await expect(slider).toHaveAttribute('aria-valuetext', 'Vor der ersten Note');
  await expect(
    component.getByRole('img', {
      name: 'Die Skala von 0 bis 15 Notenpunkten, noch ohne Noten.',
    }),
  ).toBeVisible();

  await heute.click();
  await expect(slider).toHaveValue(`${fixture.noten}`);
  await expect(component.locator(`${dot}[data-away]`)).toHaveCount(0);
  await expect(heute).toBeFocused();
});

it('dreht die Zeit auch mit dem Zeiger zurück', async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const component = await mount(story);
  const slider = component.getByRole('slider');
  const band = await slider.boundingBox();

  expect(band).not.toBeNull();
  await page.mouse.click((band?.x ?? 0) + 2, (band?.y ?? 0) + 2);
  await expect(slider).toHaveValue('0');
  await expect(component.getByText('Vor der ersten Note')).toBeVisible();
});

it('hebt beim Zeigen auf einen Punkt alle Noten seines Fachs hervor', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const component = await mount(story);
  const deutsch = component.locator(`${dot}[data-fach="deutsch"]`);

  await deutsch.last().hover();
  await expect(component.locator(`${dot}[data-picked]`)).toHaveCount(
    await deutsch.count(),
  );
  await expect(deutsch.last()).toHaveAttribute(
    'data-tip',
    'Deutsch · Klausur · 05.11.2026 · 12 P.',
  );
});

it('sagt Hero und Verlauf auch als Tabelle', async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const component = await mount(story);

  await component.getByText('Verlauf als Tabelle').click();
  const table = component.getByRole('table', {
    name: 'Alle Noten mit dem Gesamtschnitt nach jeder Note',
  });
  await expect(table.getByRole('columnheader')).toHaveCount(fixture.columns);
  await expect(table.getByRole('row')).toHaveCount(fixture.noten + 1);
  await expect(table.getByRole('row').last()).toContainText(
    '19.11.2026J1.1MathematikKlausur10 P.10 P.10,33 P.',
  );
  await expect(
    component.getByText(
      'Der Gesamtschnitt ist seit der ersten Note gestiegen.',
    ),
  ).toBeVisible();
});

it('lässt die Noten auf Wunsch noch einmal der Reihe nach landen', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const component = await mount(story);
  const slider = component.getByRole('slider');

  await component.getByRole('button', { name: 'Abspielen' }).click();
  await expect(slider).not.toHaveValue(`${fixture.noten}`);
  await expect(slider).toHaveValue(`${fixture.noten}`, {
    timeout: fixture.sequenceTimeout,
  });
  await expect(component.locator(`${dot}[data-away]`)).toHaveCount(0);
});

it('bietet ohne Bewegung kein Abspielen an und zeigt sofort den heutigen Stand', async ({
  mount,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const component = await mount(story);

  await expect(component.getByRole('slider')).toHaveValue(`${fixture.noten}`);
  await expect(
    component.getByRole('button', { name: 'Abspielen' }),
  ).toBeHidden();
});
