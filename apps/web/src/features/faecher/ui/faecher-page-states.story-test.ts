import type * as playwright from '@playwright/test';
import { expect, test as it } from '@playwright/test';

const story = (name: string) =>
  `features/faecher/ui/faecher-page-states/${name}`;

const pencil = (component: playwright.Locator, fach: string) =>
  component.getByRole('button', { name: `Bearbeiten: ${fach}` });

const nameField = (component: playwright.Locator) =>
  component.getByRole('textbox', { name: 'Name', exact: true });

it('closes an open form and keeps the focus on the choice when the Schuljahr changes', async ({
  mount,
}) => {
  const component = await mount(story('Schuljahre'));
  await expect(
    component.getByRole('heading', { name: 'Schuljahr 2026/27' }),
  ).toBeVisible();
  await pencil(component, 'Deutsch').click();
  await nameField(component).fill('Deutsch Leistungsfach');

  const older = component.getByRole('radio', { name: '2025/26' });
  await older.check();
  await expect(
    component.getByRole('heading', { name: 'Schuljahr 2025/26' }),
  ).toBeVisible();
  await expect(
    component.getByRole('heading', { name: 'Biologie' }),
  ).toBeVisible();
  await expect(component.getByText('1 Fach · Noten 1–6')).toBeVisible();
  await expect(nameField(component)).toHaveCount(0);
  await expect(older).toBeFocused();

  await component.getByRole('radio', { name: '2026/27' }).check();
  await expect(
    component.getByRole('heading', { name: 'Deutsch', exact: true }),
  ).toBeVisible();
  await expect(nameField(component)).toHaveCount(0);
});

it('offers many Schuljahre as a list that closes an open form and keeps the focus', async ({
  mount,
}) => {
  const component = await mount(story('VieleSchuljahre'));
  const choice = component.getByRole('combobox', { name: 'Schuljahr' });
  await expect(choice).toHaveValue('2026/27');
  await component.getByRole('button', { name: 'Fach anlegen' }).click();
  await expect(nameField(component)).toBeFocused();

  await choice.selectOption('2025/26');
  await expect(
    component.getByRole('heading', { name: 'Schuljahr 2025/26' }),
  ).toBeVisible();
  await expect(nameField(component)).toHaveCount(0);
  await expect(choice).toBeFocused();
});

it('opens the form under the row of its Fach and closes it with the same pencil', async ({
  mount,
  page,
}) => {
  const component = await mount(story('Schuljahre'));
  const edit = pencil(component, 'Deutsch');
  await expect(edit).toHaveAttribute('aria-expanded', 'false');
  await edit.click();
  await expect(edit).toHaveAttribute('aria-expanded', 'true');
  await expect(nameField(component)).toBeFocused();
  await expect(nameField(component)).toHaveValue('Deutsch');
  // The form stands in the row of its Fach, so the Fach stays in view.
  await expect(
    component
      .getByRole('listitem')
      .filter({
        has: page.getByRole('button', { name: 'Bearbeiten: Deutsch' }),
      })
      .getByRole('heading', { name: 'Deutsch bearbeiten' }),
  ).toBeVisible();

  await edit.click();
  await expect(nameField(component)).toHaveCount(0);
  await expect(edit).toBeFocused();

  await edit.click();
  await component.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(nameField(component)).toHaveCount(0);
  await expect(edit).toBeFocused();
});

it('shows a saved change in the row and returns the focus to its pencil', async ({
  mount,
  page,
}) => {
  const component = await mount(story('Schuljahre'));
  await pencil(component, 'Englisch').click();
  await nameField(component).fill('Englisch bilingual');
  await component
    .getByRole('radio', { name: 'Festes Verhältnis schriftlich : mündlich' })
    .check();
  await component.getByRole('button', { name: '70:30' }).click();
  await component.getByRole('button', { name: 'Fach speichern' }).click();

  await expect(nameField(component)).toHaveCount(0);
  const row = component.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Englisch bilingual' }),
  });
  await expect(row).toContainText('Schriftlich 70 % : mündlich 30 %');
  await expect(pencil(component, 'Englisch bilingual')).toBeFocused();
});

it('adds a new Fach to the list of its Schuljahr', async ({ mount }) => {
  const component = await mount(story('KeineFaecher'));
  await expect(
    component.getByRole('heading', {
      name: 'Noch keine Fächer im Schuljahr 2026/27',
    }),
  ).toBeVisible();
  await component.getByRole('button', { name: 'Fach anlegen' }).click();
  await nameField(component).fill('Physik');
  await component.getByRole('textbox', { name: 'Kürzel' }).fill('Ph');
  await component.getByRole('button', { name: 'Fach speichern' }).click();

  await expect(
    component.getByRole('heading', { name: 'Physik', exact: true }),
  ).toBeVisible();
  await expect(component.getByText('1 Fach · Notenpunkte 0–15')).toBeVisible();
  await expect(
    component.getByRole('button', { name: 'Fach anlegen' }),
  ).toBeFocused();
});

const noWayBack = /Zurückholen lässt es sich in der App nicht\./u;

it('keeps the form and its entries when saving fails, and the Fach when archiving fails', async ({
  mount,
}) => {
  const component = await mount(story('SpeichernScheitert'));
  await pencil(component, 'Deutsch').click();
  await nameField(component).fill('Deutsch Leistungsfach');
  await component.getByRole('button', { name: 'Fach speichern' }).click();
  await expect(component.getByRole('alert')).toHaveText(
    'Das Fach konnte nicht geändert werden. Die Eingaben bleiben erhalten; versuche es erneut.',
  );
  await expect(nameField(component)).toHaveValue('Deutsch Leistungsfach');
  await component.getByRole('button', { name: 'Abbrechen' }).click();

  // Archiving asks first: it cannot be undone in the app.
  const archive = component.getByRole('button', {
    name: 'Archivieren: Mathematik',
  });
  await archive.click();
  const confirm = component.getByRole('button', {
    name: 'Wirklich archivieren',
  });
  const keep = component.getByRole('button', { name: 'Behalten' });
  // Keeping is the answer that cannot be regretted, so it is the one at hand, and it says what is asked.
  await expect(keep).toBeFocused();
  await expect(keep).toHaveAccessibleDescription(noWayBack);
  await expect(confirm).toHaveAccessibleDescription(noWayBack);
  await keep.click();
  await expect(confirm).toHaveCount(0);
  await expect(archive).toBeFocused();

  await archive.click();
  await confirm.press('Enter');
  await expect(component.getByRole('alert')).toHaveText(
    'Das Fach konnte nicht archiviert werden. Es bleibt sichtbar; versuche es erneut.',
  );
  await expect(
    component.getByRole('heading', { name: 'Mathematik' }),
  ).toBeVisible();
  // The Fach is still there, and so is the keyboard.
  await expect(archive).toBeFocused();
});

const archiveByKeyboard = async (
  component: playwright.Locator,
  fach: string,
) => {
  const archive = component.getByRole('button', {
    name: `Archivieren: ${fach}`,
  });
  await archive.focus();
  await archive.press('Enter');
  await component
    .getByRole('button', { name: 'Wirklich archivieren' })
    .press('Enter');
  await expect(component.getByRole('heading', { name: fach })).toHaveCount(0);
};

it('hands the keyboard to a Fach that stays when one is archived', async ({
  mount,
}) => {
  const component = await mount(story('Schuljahre'));
  await expect(
    component.getByRole('heading', { name: 'Mathematik' }),
  ).toBeVisible();

  // The next Fach of the list takes over.
  await archiveByKeyboard(component, 'Mathematik');
  await expect(pencil(component, 'Deutsch')).toBeFocused();

  // After the last of the list, the one before it does.
  await archiveByKeyboard(component, 'Gemeinschaftskunde');
  await expect(pencil(component, 'Englisch')).toBeFocused();
});

it('hands the keyboard to "Fach anlegen" when the last Fach is archived', async ({
  mount,
}) => {
  const component = await mount(story('Schuljahre'));
  await component.getByRole('radio', { name: '2025/26' }).check();
  await expect(
    component.getByRole('heading', { name: 'Biologie' }),
  ).toBeVisible();

  await archiveByKeyboard(component, 'Biologie');
  await expect(
    component.getByRole('button', { name: 'Fach anlegen' }),
  ).toBeFocused();
});

it('sends to the Einstellungen while there is no Halbjahr', async ({
  mount,
}) => {
  const component = await mount(story('KeinHalbjahr'));
  await expect(
    component.getByRole('heading', { name: 'Noch kein Halbjahr' }),
  ).toBeVisible();
  await expect(
    component.getByRole('link', { name: 'Zu den Einstellungen' }),
  ).toBeVisible();
  await expect(
    component.getByRole('button', { name: 'Fach anlegen' }),
  ).toHaveCount(0);
  await expect(component.getByRole('radio')).toHaveCount(0);
});
