import { expect, test as it } from '@playwright/test';

it('widmet den heutigen Tag der Leistung — ohne Minuten', async ({
  mount,
  page,
}) => {
  const component = await mount('features/lernen/ui/learned-for-leistung/Nie');
  await expect(component.getByText('noch nicht dafür gelernt')).toBeVisible();

  await component.getByRole('button', { name: 'Heute dafür gelernt' }).click();

  const logged = page.getByRole('status', { name: 'Eingetragener Lerntag' });
  await expect(logged).toContainText('"subjectId":"mathe"');
  await expect(logged).toContainText('"gradeId":"k-1"');
  await expect(logged).toContainText('"minutes":null');
});

it('lässt den Knopf ruhen, wenn heute schon dafür gelernt wurde', async ({
  mount,
}) => {
  const component = await mount(
    'features/lernen/ui/learned-for-leistung/Heute',
  );

  await expect(
    component.getByText('heute gelernt · an 3 der letzten 7 Tage'),
  ).toBeVisible();
  await expect(
    component.getByRole('button', { name: 'Heute dafür gelernt' }),
  ).toBeDisabled();
});
