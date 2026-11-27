import { expect, test as it } from '@playwright/test';

import {
  chooseNote,
  chooser,
  entryForm,
  fach,
  list,
  noteOnBar,
  noteValue,
  pickFach,
  rowOn,
  search,
  settle,
} from './noten-list.story-locators.ts';

/** A new Note gets today's date, which in the story is this day. */
const todayRow = 'Do 26.11.';

const addIn = (component: Parameters<typeof fach>[0], name: string) =>
  fach(component, name).getByRole('button', {
    name: 'Note eintragen',
    exact: true,
  });

const enter = (component: Parameters<typeof fach>[0]) =>
  entryForm(component).getByRole('button', {
    name: 'Note eintragen',
    exact: true,
  });

/**
 * The top bar's "Note eintragen" leads here with `neu` in the address and no
 * Fach. The page asks for the Fach, and the address follows the choice, so a
 * reload opens the same entry again.
 */
it('asks for the Fach when the address asks for a new Note', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Neu');
  await expect(chooser(component)).toContainText('Neue Note: in welchem Fach?');
  await expect(
    chooser(component).getByRole('button', { name: 'Latein' }),
  ).toBeFocused();
  await expect(chooser(component)).toContainText('Fachschnitt 2,5');
  await expect(chooser(component)).toContainText('noch keine Note');
  await pickFach(component, 'Mathematik');

  await expect(
    fach(component, 'Mathematik').locator('form[data-note-entry]'),
  ).toContainText('Neue Note in Mathematik');
  await expect(search(component)).toHaveText('{"neu":true,"fach":"mathe"}');
});

it('enters a new Note on the bar of its Fach and lands it in the list', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  const add = addIn(component, 'Latein');
  await add.click();
  await expect(search(component)).toHaveText('{"neu":true,"fach":"latein"}');
  await expect(entryForm(component)).toContainText('Neue Note in Latein');
  // The keyboard starts on the bar, at the step nearest to where Latein stands.
  await expect(noteOnBar(component, 'Note 2,5')).toBeFocused();
  await chooseNote(component, 'Note 1,5');
  await enter(component).click();
  await expect(
    entryForm(component).getByRole('button', { name: 'Wird eingetragen …' }),
  ).toHaveAttribute('aria-busy', 'true');
  await settle(component, 'complete');

  await expect(entryForm(component)).toHaveCount(0);
  await expect(noteValue(rowOn(component, todayRow))).toHaveText('1,5');
  await expect(list(component).getByRole('status')).toHaveText(
    'Eingetragen: Latein, Klausur vom 26.11.2026, 1,5.',
  );
  await expect(search(component)).toHaveText('{}');
  await expect(add).toBeFocused();
});

/** A Klausur has a date before it has a Note, so it can be entered without one. */
it('enters a Klausur without a Note as ausstehend', async ({ mount }) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await addIn(component, 'Kunst').click();
  await entryForm(component)
    .getByRole('button', { name: 'Als ausstehend eintragen' })
    .click();
  await settle(component, 'complete');

  await expect(fach(component, 'Kunst')).toContainText('1 ausstehend');
  await expect(list(component).getByRole('status')).toHaveText(
    'Eingetragen: Kunst, Klausur vom 26.11.2026, noch ohne Note.',
  );
});

/** A mündliche Note is not announced beforehand: without a Note there is nothing to enter. */
it('does not send a mündliche Note without a Note', async ({ mount }) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await addIn(component, 'Kunst').click();
  await entryForm(component).getByRole('radio', { name: 'Mündlich' }).click();
  const submit = enter(component);
  await expect(submit).toHaveAttribute('aria-disabled', 'true');
  // The button stays reachable so it can say why; pressing it leads to the bar instead of sending.
  await submit.press('Enter');

  // Nothing was sent: there is no call to settle, and the entry stays open on the bar.
  await expect(entryForm(component)).toHaveCount(1);
  await expect(noteOnBar(component, 'Note 3,5')).toBeFocused();
  await expect(fach(component, 'Kunst')).toContainText(
    'Ohne Note lassen sich nur Klausur, GFS und Test eintragen.',
  );
});

it('closes a new entry with Escape and takes neu out of the address', async ({
  mount,
  page,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  const add = addIn(component, 'Latein');
  await add.click();
  await expect(entryForm(component)).toHaveCount(1);
  await page.keyboard.press('Escape');

  await expect(entryForm(component)).toHaveCount(0);
  await expect(search(component)).toHaveText('{}');
  await expect(add).toBeFocused();
});

/**
 * A failed attempt keeps what was entered. The second attempt goes out under
 * the same id, so a first attempt that did arrive is not entered twice.
 */
it('keeps the entry after a failure and saves it on the next attempt', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await addIn(component, 'Latein').click();
  await chooseNote(component, 'Note 1,5');
  await enter(component).click();
  await settle(component, 'fail');

  await expect(entryForm(component).getByRole('alert')).toContainText(
    'nicht gespeichert werden',
  );
  await expect(noteOnBar(component, 'Note 1,5')).toBeChecked();
  await expect(rowOn(component, todayRow)).toHaveCount(0);

  await enter(component).click();
  await settle(component, 'complete');
  await expect(rowOn(component, todayRow)).toHaveCount(1);
  await expect(component.getByRole('alert')).toHaveCount(0);
});

/**
 * An entry that was closed has no form left to show a failure in, and a new
 * Note has no row either. The page says it above the list instead of losing it.
 */
it('says so when a new Note fails after its entry gave way to another', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await addIn(component, 'Latein').click();
  await chooseNote(component, 'Note 1,5');
  await enter(component).click();
  await addIn(component, 'Kunst').click();
  await expect(entryForm(component)).toContainText('Neue Note in Kunst');
  await settle(component, 'fail');

  await expect(list(component).getByRole('alert')).toContainText(
    'Die neue Note in Latein wurde nicht gespeichert.',
  );
  await expect(entryForm(component).getByRole('alert')).toHaveCount(0);
});
