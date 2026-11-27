import type * as playwright from '@playwright/test';
import { expect, test as it } from '@playwright/test';

const stories = 'features/halbjahre/ui/halbjahre-management';

const rowOf = (component: playwright.Locator, label: string) =>
  component.getByRole('listitem').filter({
    has: component.page().getByRole('heading', { exact: true, name: label }),
  });

/** The stretch of a Halbjahr on the time line; its tip begins with the label. */
const stretchOf = (component: playwright.Locator, label: string) =>
  component.locator(`rect[data-tip^="${label} "]`);

const timeline = (component: playwright.Locator) =>
  component.getByRole('img', { name: 'Zeitleiste der Halbjahre' });

/** The date field's name is its label followed by the date it holds. */
const startsOnName = /^Beginn/u;

/** How the figure ends once the Halbjahr from the form is drawn into it. */
const firstHalbjahrHeld =
  /J1\.1: Notenpunkte 0–15\. Gestrichelt: J1\.1, wie es im Formular steht\.$/u;
const lastHalbjahrHeld = /Gestrichelt: J1\.2/u;

/** The Laufbahn story holds Klasse 9 to J1, of which only J1.2 has no Noten. */
const laufbahnLength = 6;

it('invites a new account to create the first Halbjahr and draws it while it is entered', async ({
  mount,
}) => {
  const component = await mount(`${stories}/Leer`);
  await expect(
    component.getByRole('heading', { name: 'Noch kein Halbjahr' }),
  ).toBeVisible();
  await expect(timeline(component)).toHaveCount(0);
  await expect(component.getByRole('listitem')).toHaveCount(0);

  const create = component.getByRole('button', { name: 'Halbjahr anlegen' });
  await create.click();
  await expect(
    component.getByRole('heading', { exact: true, name: 'Halbjahre' }),
  ).toBeVisible();
  await component
    .getByRole('combobox', { name: 'Klassenstufe' })
    .selectOption('J1');
  await component.getByRole('radio', { name: '1. Halbjahr' }).check();
  await expect(timeline(component)).toHaveAccessibleName(firstHalbjahrHeld);

  await component.getByRole('button', { name: 'Halbjahr speichern' }).click();
  await expect(rowOf(component, 'J1.1')).toContainText('Notenpunkte 0–15');
  await expect(
    component.getByRole('heading', { name: 'Neues Halbjahr' }),
  ).toHaveCount(0);
  await expect(create).toBeFocused();
});

it('links a row and its stretch on the time line, by pointer and by keyboard', async ({
  mount,
}) => {
  const component = await mount(`${stories}/Laufbahn`);
  await rowOf(component, 'J1.1').hover();
  await expect(stretchOf(component, 'J1.1')).toHaveAttribute('data-hover', '');
  await expect(stretchOf(component, '10.2')).not.toHaveAttribute('data-hover');

  await stretchOf(component, '9.2').hover();
  await expect(rowOf(component, '9.2')).toHaveAttribute('data-hover', '');
  await expect(rowOf(component, 'J1.1')).not.toHaveAttribute('data-hover');

  await rowOf(component, '10.2')
    .getByRole('button', { name: 'Bearbeiten' })
    .focus();
  await expect(stretchOf(component, '10.2')).toHaveAttribute('data-hover', '');
});

it('offers deletion only for a Halbjahr without Noten and says why', async ({
  mount,
}) => {
  const component = await mount(`${stories}/Laufbahn`);
  await expect(component.getByRole('listitem')).toHaveCount(laufbahnLength);
  await expect(component.getByRole('button', { name: 'Löschen' })).toHaveCount(
    1,
  );
  await expect(
    rowOf(component, 'J1.2').getByRole('button', { name: 'Löschen' }),
  ).toBeVisible();
  await expect(
    component.getByText('Löschen lässt sich nur ein leeres Halbjahr.'),
  ).toBeVisible();
});

it('changes the dates of a Halbjahr, follows them on the line and saves them', async ({
  mount,
}) => {
  const component = await mount(`${stories}/Laufbahn`);
  const row = rowOf(component, 'J1.2');
  const edit = row.getByRole('button', { name: 'Bearbeiten' });
  await edit.click();
  await expect(
    component.getByRole('heading', { name: 'Halbjahr bearbeiten' }),
  ).toBeVisible();
  await expect(timeline(component)).toHaveAccessibleName(lastHalbjahrHeld);

  await component
    .getByRole('button', { name: 'Zeitraum abweichend festlegen' })
    .click();
  await component.getByRole('button', { name: startsOnName }).click();
  await component
    .getByRole('dialog', { name: 'Datum wählen' })
    .getByRole('button', { name: 'Montag, 8. Februar 2027' })
    .click();
  await expect(
    component.locator('rect[data-tip^="J1.2 · 08.02.2027 bis 31.07.2027"]'),
  ).toHaveCount(1);

  await component.getByRole('button', { name: 'Halbjahr speichern' }).click();
  await expect(row).toContainText('08.02.2027 bis 31.07.2027');
  await expect(row).toContainText('abweichender Zeitraum');
  await expect(edit).toBeFocused();
});

it('keeps the form and says why when saving fails', async ({ mount }) => {
  const component = await mount(`${stories}/SpeichernScheitert`);
  await component.getByRole('button', { name: 'Halbjahr anlegen' }).click();
  await component.getByRole('button', { name: 'Halbjahr speichern' }).click();
  await expect(component.getByRole('alert')).toHaveText(
    'Das Halbjahr konnte nicht angelegt werden. Prüfe die Verbindung und versuche es erneut.',
  );
  await expect(
    component.getByRole('heading', { name: 'Neues Halbjahr' }),
  ).toBeVisible();
  await expect(
    component.getByRole('button', { name: 'Halbjahr speichern' }),
  ).toBeEnabled();
});

it('says that the Halbjahre are loading', async ({ mount }) => {
  const component = await mount(`${stories}/Laedt`);
  await expect(
    component.getByRole('status').filter({ hasText: 'Halbjahre werden' }),
  ).toHaveText('Halbjahre werden geladen …');
  await expect(component.getByRole('listitem')).toHaveCount(0);
  await expect(
    component.getByRole('heading', { name: 'Noch kein Halbjahr' }),
  ).toHaveCount(0);
});

it('offers a retry when the Halbjahre cannot be loaded and shows them after it', async ({
  mount,
}) => {
  const component = await mount(`${stories}/LadenScheitert`);
  await expect(component.getByRole('alert')).toContainText(
    'Die Halbjahre konnten nicht geladen werden.',
  );
  await component.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(rowOf(component, '10.1')).toBeVisible();
  await expect(component.getByRole('alert')).toHaveCount(0);
  await expect(
    component.getByRole('region', { name: 'Halbjahre' }),
  ).toBeFocused();
});
