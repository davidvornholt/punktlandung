import type * as playwright from '@playwright/test';
import { expect, test as it } from '@playwright/test';

const story = (name: string) => `features/faecher/ui/faecher-page/${name}`;

const openDraft = async (component: playwright.Locator) => {
  await component.getByRole('button', { name: 'Fach anlegen' }).click();
  const name = component.getByRole('textbox', { name: 'Name' });
  await name.fill('Physik');
  return name;
};

const failRefresh = async (component: playwright.Locator) => {
  await component.getByTestId('refetch').dispatchEvent('click');
  await expect(component.getByRole('alert')).toContainText(
    'konnten nicht aktualisiert werden',
  );
};

for (const scenario of [
  'FaecherNeuladenScheitert',
  'HalbjahreNeuladenScheitert',
]) {
  it(`keeps the Fächer and an open draft when a refresh fails (${scenario})`, async ({
    mount,
  }) => {
    const component = await mount(story(scenario));
    await expect(component.getByText('Mathematik')).toBeVisible();
    const name = await openDraft(component);
    await failRefresh(component);
    await expect(name).toHaveValue('Physik');
    await expect(component.getByText('Mathematik')).toBeVisible();
  });
}

it('returns focus to the Fächer after a successful refresh retry', async ({
  mount,
}) => {
  const component = await mount(story('FaecherNeuladenScheitert'));
  await expect(component.getByText('Mathematik')).toBeVisible();
  await failRefresh(component);
  const retry = component.getByRole('button', { name: 'Erneut versuchen' });
  await retry.focus();
  await retry.press('Enter');
  await component.getByTestId('finish-read').dispatchEvent('click');
  await expect(component.getByRole('alert')).toHaveCount(0);
  await expect(component.getByRole('region', { name: 'Fächer' })).toBeFocused();
});

it('returns focus to the page heading after a successful Halbjahre retry', async ({
  mount,
}) => {
  const component = await mount(story('HalbjahreNeuladenScheitert'));
  await expect(component.getByText('Mathematik')).toBeVisible();
  await failRefresh(component);
  const retry = component.getByRole('button', { name: 'Erneut versuchen' });
  await retry.focus();
  await retry.press('Enter');
  await component.getByTestId('finish-read').dispatchEvent('click');
  await expect(component.getByRole('alert')).toHaveCount(0);
  await expect(
    component.getByRole('heading', { level: 1, name: 'Fächer' }),
  ).toBeFocused();
});

it('keeps focus in the draft when a refresh retry finishes later', async ({
  mount,
}) => {
  const component = await mount(story('FaecherNeuladenScheitert'));
  const name = await openDraft(component);
  await failRefresh(component);
  await component.getByRole('button', { name: 'Erneut versuchen' }).click();
  await name.focus();
  await component.getByTestId('finish-read').dispatchEvent('click');
  await expect(component.getByRole('alert')).toHaveCount(0);
  await expect(name).toBeFocused();
});
