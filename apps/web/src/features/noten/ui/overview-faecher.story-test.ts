import { expect, test as it } from '@playwright/test';

/** What the Fächer fixture of the stories holds. */
const fixture = {
  faecher: 3,
  /** Deutsch has two Noten and a Klausur that is still to come. */
  deutschDiscs: 3,
} as const;

it('zeigt je Fach seine Skala und seinen Schnitt und führt zu seinen Noten', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/overview-faecher/Faecher');
  const block = component.getByRole('region', { name: 'Fächer in J1.1' });
  const rows = block.getByRole('listitem');

  await expect(rows).toHaveCount(fixture.faecher);
  const deutsch = block.getByRole('link', {
    name: 'Deutsch 10,5 P. aus 2 Noten, 1 ausstehend',
  });
  await expect(deutsch).toHaveAttribute('href', '/noten?fach=deutsch');
  await expect(deutsch).toContainText('10,5');
  await expect(deutsch.locator('[data-part="disc"]')).toHaveCount(
    fixture.deutschDiscs,
  );
  await expect(
    block.getByRole('link', {
      name: 'Mathematik 11 P. aus 1 Note, 1 ausstehend',
    }),
  ).toHaveAttribute('href', '/noten?fach=mathe');
  await expect(
    block.getByRole('link', { name: 'Chemie noch keine Note' }),
  ).toContainText('–');
});

it('verweist ohne Fächer auf die Fächerseite', async ({ mount }) => {
  const component = await mount(
    'features/noten/ui/overview-faecher/OhneFaecher',
  );

  await expect(
    component.getByText('Im Schuljahr 2026/27 gibt es noch kein Fach.'),
  ).toBeVisible();
  await expect(component.getByRole('link', { name: 'Fächer' })).toHaveAttribute(
    'href',
    '/faecher',
  );
});

it('lädt nach einem Fehler neu und gibt den Fokus an den Abschnitt', async ({
  mount,
}) => {
  const component = await mount(
    'features/noten/ui/overview-faecher/LadenScheitert',
  );
  const block = component.getByRole('region', { name: 'Fächer in J1.1' });

  await expect(block.getByRole('alert')).toContainText(
    'Die Fächer konnten nicht geladen werden.',
  );
  await block.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(block.getByRole('listitem')).toHaveCount(fixture.faecher);
  await expect(block.getByRole('alert')).toHaveCount(0);
  await expect(block).toBeFocused();
});
