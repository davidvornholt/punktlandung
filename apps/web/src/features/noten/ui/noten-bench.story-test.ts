import type * as playwright from '@playwright/test';
import { expect, test as it } from '@playwright/test';

type Locator = playwright.Locator;

/** What the fixtures of the stories hold. */
const fixture = {
  punkteSteps: 16,
  sechserSteps: 21,
  physikDiscs: 3,
  physikDiscsAfterSaving: 4,
} as const;

/** What the readout says under the figure once a Note is chosen. */
const hintText = {
  physik: /Danach steht Physik bei/u,
  mathematik: /Danach steht Mathematik bei/u,
  share: /^Zählt\s\d+\s% des Fachschnitts\./u,
  /** The Fachschnitt the Note leads to. */
  promised: /bei (?<average>[\d,]+)\sNotenpunkten\./u,
} as const;

const barValue = /Notenpunkt/u;

const form = (component: Locator, name: string) =>
  component.getByRole('form', { name });

const onBar = (component: Locator, name: string) =>
  component.getByRole('radio', { name, exact: true });

/** The radio buttons of the bar are there for keyboard and screen reader only, so a value is chosen with the space bar. */
const choose = async (component: Locator, name: string) => {
  const radio = onBar(component, name);
  await radio.focus();
  await radio.press('Space');
};

const readout = (component: Locator, name: 'Note' | 'Notenpunkte') =>
  component.getByRole('status', { name, exact: true });

const discs = (component: Locator) =>
  component.locator('[data-part="disc"]:not([data-held])');

const log = (component: Locator) => component.getByTestId('log');

it('offers exactly the Notenpunkte a Note can have and starts where the Fach stands', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-bench/Neu');
  await expect(form(component, 'Neue Note in Physik')).toBeVisible();
  const choice = component.getByRole('group', {
    name: 'Notenpunkte auf der Skala wählen',
  });
  await expect(choice.getByRole('radio')).toHaveCount(fixture.punkteSteps);
  await expect(onBar(component, '0 Notenpunkte')).toHaveCount(1);
  await expect(onBar(component, '15 Notenpunkte')).toHaveCount(1);
  // Physik stands at 12; nothing is chosen yet, so the keyboard waits there.
  await expect(onBar(component, '12 Notenpunkte')).toBeFocused();
  await expect(choice.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(readout(component, 'Notenpunkte')).toHaveText('noch offen');
});

it('says in which Wertungsbereich the Leistungsart counts', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-bench/Neu');
  const sheet = form(component, 'Neue Note in Physik');
  await expect(sheet).toContainText('Zählt als schriftlich.');
  await sheet.getByRole('radio', { name: 'Mündlich' }).click();
  await expect(sheet).toContainText('Zählt als mündlich.');
});

/**
 * The preview is worked out by the functions that work out the real
 * Fachschnitt: what the readout promises is what stands under the bar once
 * the Note is saved.
 */
it('previews the Fachschnitt the Note leads to and lands the Note there', async ({
  mount,
  page,
}) => {
  const component = await mount('features/noten/ui/noten-bench/Neu');
  await choose(component, '10 Notenpunkte');
  await page.keyboard.press('ArrowLeft');
  await expect(onBar(component, '9 Notenpunkte')).toBeChecked();
  await expect(readout(component, 'Notenpunkte')).toHaveText('9 P.');
  await expect(component.locator('[data-part="held-text"]')).toHaveText('9 P.');
  const hint = component.getByText(hintText.physik);
  await expect(hint).toContainText(hintText.share);
  const promised = hintText.promised.exec((await hint.textContent()) ?? '')
    ?.groups?.average;
  expect(promised).toBeDefined();

  await expect(discs(component)).toHaveCount(fixture.physikDiscs);
  await form(component, 'Neue Note in Physik')
    .getByRole('button', { name: 'Note eintragen' })
    .click();
  await expect(
    component.getByRole('button', { name: 'Wird eingetragen …' }),
  ).toHaveAttribute('aria-busy', 'true');
  await expect(log(component)).toContainText('"subjectId":"physik"');
  await expect(log(component)).toContainText('"wert":9');

  await expect(component.getByRole('form')).toHaveCount(0);
  await expect(discs(component)).toHaveCount(fixture.physikDiscsAfterSaving);
  await expect(component.locator('[data-part="fulcrum-value"]')).toHaveText(
    `${promised} P.`,
  );
});

it('sends Gewicht and Notiz with the Note', async ({ mount }) => {
  const component = await mount('features/noten/ui/noten-bench/Neu');
  const sheet = form(component, 'Neue Note in Physik');
  await choose(component, '10 Notenpunkte');
  await sheet.getByText('Gewicht und Notiz').click();
  await sheet.getByRole('button', { name: 'Gewicht erhöhen' }).click();
  await expect(sheet.getByRole('status')).toHaveText('1,25-fach');
  await sheet.getByRole('textbox', { name: 'Notiz' }).fill('  Optik ');
  await sheet.getByRole('button', { name: 'Note eintragen' }).click();

  await expect(log(component)).toContainText('"gewicht":1.25');
  await expect(log(component)).toContainText('"notiz":"Optik"');
});

it('hands what was typed over when another Fach is asked for', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-bench/Neu');
  await choose(component, '10 Notenpunkte');
  await component.getByRole('button', { name: 'Anderes Fach' }).click();

  await expect(log(component)).toContainText('"kind":"klausur"');
  await expect(log(component)).toContainText('"wert":10');
});

it('gives the entry up with Escape and with "Abbrechen"', async ({
  mount,
  page,
}) => {
  const component = await mount('features/noten/ui/noten-bench/Neu');
  await choose(component, '10 Notenpunkte');
  await page.keyboard.press('Escape');
  await expect(component.getByRole('form')).toHaveCount(0);
  await expect(discs(component)).toHaveCount(fixture.physikDiscs);

  await component.getByRole('button', { name: 'Wieder öffnen' }).click();
  // A new entry starts empty: what was chosen before it was given up is gone.
  await expect(readout(component, 'Notenpunkte')).toHaveText('noch offen');
  await component.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(component.getByRole('form')).toHaveCount(0);
});

it('changes a Note from where it lies and can take it off the bar again', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-bench/Aendern');
  const sheet = form(component, 'Klausur ändern');
  await expect(sheet).toBeVisible();
  await expect(onBar(component, '13 Notenpunkte')).toBeChecked();
  await expect(onBar(component, '13 Notenpunkte')).toBeFocused();
  await expect(
    sheet.getByRole('button', { name: 'Änderung speichern' }),
  ).toBeVisible();
  await expect(sheet.getByRole('textbox', { name: 'Notiz' })).toHaveValue(
    'Mechanik',
  );

  await component.getByRole('button', { name: 'Offen lassen' }).click();
  await expect(readout(component, 'Notenpunkte')).toHaveText('noch offen');
  await expect(component).toContainText(
    'Ohne Note wird die Klausur als ausstehend eingetragen',
  );
  // The button went away with the Note; the keyboard is back on the bar.
  await expect(component.getByRole('radio', { name: barValue })).toHaveCount(
    fixture.punkteSteps,
  );
  await expect(component.locator('input[name="wert"]:focus')).toHaveCount(1);
});

it('enters the Note of a Leistung that was planned', async ({ mount }) => {
  const component = await mount('features/noten/ui/noten-bench/Eintragen');
  const sheet = form(component, 'Note für den Test eintragen');
  await expect(sheet).toBeVisible();
  await expect(readout(component, 'Notenpunkte')).toHaveText('noch offen');
  await choose(component, '8 Notenpunkte');
  await sheet.getByRole('button', { name: 'Note eintragen' }).click();

  await expect(log(component)).toContainText('"kind":"test"');
  await expect(log(component)).toContainText('"wert":8');
  await expect(component.getByRole('form')).toHaveCount(0);
  // The disc that waited beside the bar now lies on it; none was added.
  await expect(discs(component)).toHaveCount(fixture.physikDiscs);
});

it('keeps what was entered when saving fails', async ({ mount }) => {
  const component = await mount('features/noten/ui/noten-bench/Fehler');
  const sheet = form(component, 'Neue Note in Physik');
  await choose(component, '10 Notenpunkte');
  await sheet.getByRole('button', { name: 'Note eintragen' }).click();

  await expect(sheet.getByRole('alert')).toContainText(
    'nicht gespeichert werden',
  );
  await expect(onBar(component, '10 Notenpunkte')).toBeChecked();
  await expect(
    sheet.getByRole('button', { name: 'Note eintragen' }),
  ).toHaveAttribute('aria-disabled', 'false');
  await expect(discs(component)).toHaveCount(fixture.physikDiscs);
});

it('offers quarter steps in the Sechsersystem', async ({ mount, page }) => {
  const component = await mount('features/noten/ui/noten-bench/Sechser');
  const choice = component.getByRole('group', {
    name: 'Note auf der Skala wählen',
  });
  await expect(choice.getByRole('radio')).toHaveCount(fixture.sechserSteps);
  await expect(onBar(component, 'Note 1')).toHaveCount(1);
  await expect(onBar(component, 'Note 6')).toHaveCount(1);
  await choose(component, 'Note 2,25');
  await expect(readout(component, 'Note')).toHaveText('2,25');
  // Better is to the right on both bars, so the right arrow leads to the better Note.
  await page.keyboard.press('ArrowRight');
  await expect(onBar(component, 'Note 2')).toBeChecked();
  await expect(component.getByText(hintText.mathematik)).toBeVisible();
});
