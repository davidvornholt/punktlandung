import { expect, test as it } from '@playwright/test';

const story = 'features/halbjahre/ui/halbjahre-management/NeuladenScheitert';

it('keeps the list and an open edit when a background refresh fails', async ({
  mount,
}) => {
  const component = await mount(story);
  await component.getByRole('button', { name: 'Halbjahr anlegen' }).click();
  const formHeading = component.getByRole('heading', {
    name: 'Neues Halbjahr',
  });
  await expect(formHeading).toBeVisible();
  await component.getByTestId('refetch').dispatchEvent('click');
  await expect(component.getByRole('alert')).toContainText(
    'konnten nicht aktualisiert werden',
  );
  await expect(formHeading).toBeVisible();
  await expect(component.getByRole('listitem').first()).toContainText('10.1');
});

it('returns focus to the Halbjahre after a successful refresh retry', async ({
  mount,
}) => {
  const component = await mount(story);
  await component.getByTestId('refetch').dispatchEvent('click');
  const retry = component.getByRole('button', { name: 'Erneut versuchen' });
  await retry.focus();
  await retry.press('Enter');
  await component.getByTestId('finish-read').dispatchEvent('click');
  await expect(component.getByRole('alert')).toHaveCount(0);
  await expect(
    component.getByRole('region', { name: 'Halbjahre' }),
  ).toBeFocused();
});
