import { expect, test as it } from '@playwright/test';

/**
 * Ohne Fach lässt sich keine Note eintragen. Die Seite sagt das einmal und
 * nennt den einen Schritt, der es ändert.
 */
it('sagt ohne Fach, was fehlt, und führt zu den Fächern', async ({ mount }) => {
  const component = await mount('features/noten/ui/noten-section/OhneFach');

  await expect(
    component.getByRole('heading', {
      name: 'Noch kein Fach in diesem Schuljahr',
    }),
  ).toBeVisible();
  await expect(
    component.getByRole('link', { name: 'Fach anlegen' }),
  ).toHaveAttribute('href', '/faecher');
  await expect(
    component.getByRole('button', { name: 'Note eintragen' }),
  ).toHaveCount(0);
});
