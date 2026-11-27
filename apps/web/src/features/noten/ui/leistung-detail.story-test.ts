import type * as playwright from '@playwright/test';
import { expect, test as it } from '@playwright/test';
import type { Ausstehend } from './leistung-detail.story.tsx';

type Locator = playwright.Locator;

const story = (name: string) => `features/noten/ui/leistung-detail/${name}`;

/** What the fixture of the stories holds: the other Leistungen of Mathematik. */
const othersInMathe = 4;

const heading = (component: Locator, name: string) =>
  component.getByRole('heading', { level: 1, name, exact: true });

/** The Note in the head of the page, or what stands in its place. */
const status = (component: Locator) =>
  component.locator('[data-leistung-status]');

/** The sentence under the bar on what the Leistung does to the Fachschnitt. */
const standing = (component: Locator) =>
  component.locator('[data-leistung-standing]');

const address = (component: Locator) => component.getByTestId('address');

const entry = (component: Locator, name: string) =>
  component.getByRole('form', { name });

const onBar = (component: Locator, name: string) =>
  component.getByRole('radio', { name, exact: true });

/** The radio buttons of the bar are there for keyboard and screen reader only, so a value is chosen with the space bar. */
const choose = async (component: Locator, name: string) => {
  const radio = onBar(component, name);
  await radio.focus();
  await radio.press('Space');
};

const button = (component: Locator, name: string) =>
  component.getByRole('button', { name, exact: true });

const gradeForm = 'Note für die Klausur eintragen';

it('zeigt eine ausstehende Leistung mit dem, was sie zählen wird', async ({
  mount,
}) => {
  const component = await mount(story('Ausstehend'));

  await expect(heading(component, 'Klausur')).toBeVisible();
  await expect(
    component.getByText(
      'Mathematik · J1.1 · Dienstag, 8. Dezember 2026 · in 12 Tagen',
    ),
  ).toBeVisible();
  await expect(status(component)).toHaveText('ausstehend');
  await expect(standing(component)).toHaveText(
    'Die Klausur ist noch nicht gelandet. Sie wartet am rechten Rand der Skala und zählt erst, wenn die Note da ist.',
  );
  await expect(
    component.getByRole('heading', { name: 'So viel zählt sie' }),
  ).toBeVisible();
  await expect(
    component.getByText('Benotet zählt sie 20 % des Fachschnitts.'),
  ).toBeVisible();
  const others = component.getByRole('region', { name: 'Auch in Mathematik' });
  await expect(others.getByRole('link')).toHaveCount(othersInMathe);
});

it('sagt für eine benotete Leistung, wie sie zum Fachschnitt liegt und was sie mit ihm macht', async ({
  mount,
}) => {
  const component = await mount(story('Benotet'));

  await expect(heading(component, 'Klausur · Analysis')).toBeVisible();
  await expect(status(component)).toHaveText('Note: 8 P.');
  // 8, 12, 10 and 10 average 10; without the 8 the other three average 10,67.
  await expect(standing(component)).toHaveText(
    'Die Klausur liegt 2 P. unter dem Fachschnitt und zieht ihn nach links: Ohne sie stünde Mathematik bei 10,67 P.',
  );
  await expect(
    component.getByText(
      'Die Klausur zählt heute 25 % des Fachschnitts. Sind auch die ausstehenden Leistungen benotet, sind es 20 %.',
    ),
  ).toBeVisible();
  await expect(button(component, 'Bearbeiten')).toBeVisible();
});

it('sagt es im Sechsersystem mit besser und schlechter', async ({ mount }) => {
  const component = await mount(story('Sechser'));

  await expect(status(component)).toHaveText('Note: 3');
  // 3, 2, 2,5 and 2,5 average 2,5; without the 3 the other three average 2,33.
  await expect(standing(component)).toHaveText(
    'Die Klausur ist um 0,5 schlechter als der Fachschnitt und zieht ihn nach links: Ohne sie stünde Mathematik bei 2,33.',
  );
});

it('sagt, wenn die Leistung die einzige ihres Fachs ist', async ({ mount }) => {
  const component = await mount(story('Allein'));

  await expect(standing(component)).toHaveText(
    'Die Klausur ist bisher die einzige Note in Mathematik und bestimmt den Fachschnitt allein.',
  );
  await expect(
    component.getByText('Die Klausur zählt heute 100 % des Fachschnitts.'),
  ).toBeVisible();
  await expect(
    component.getByRole('heading', { name: 'Auch in Mathematik' }),
  ).toHaveCount(0);
});

it('markiert eine Leistung, deren Note fehlt', async ({ mount }) => {
  const component = await mount(story('NoteFehlt'));

  await expect(status(component)).toHaveText('Note fehlt noch');
  await expect(standing(component)).toHaveText(
    'Die Klausur ist vorbei, aber die Note fehlt noch. Bis sie eingetragen ist, zählt sie nicht.',
  );
});

it('trägt die Note der ausstehenden Klausur auf der Skala ihres Fachs ein', async ({
  mount,
}) => {
  const component = await mount(story('Ausstehend'));

  await button(component, 'Note eintragen').click();
  const form = entry(component, gradeForm);
  await expect(form).toBeVisible();
  await choose(component, '12 Notenpunkte');
  await form.getByRole('button', { name: 'Note eintragen' }).click();

  await expect(status(component)).toHaveText('Note: 12 P.');
  await expect(form).toHaveCount(0);
  // 12, 12, 10 and 10 average 11; without this 12 the other three average 10,67.
  await expect(standing(component)).toHaveText(
    'Die Klausur liegt 1 P. über dem Fachschnitt und zieht ihn nach rechts: Ohne sie stünde Mathematik bei 10,67 P.',
  );
  await expect(
    component.getByText(
      'Gespeichert: Mathematik, Klausur vom 08.12.2026, 12 P.',
    ),
  ).toBeAttached();
  // The button that opened the entry takes the keyboard back, now as the way to change the Note.
  await expect(button(component, 'Bearbeiten')).toBeFocused();
});

it('öffnet den Eintrag, wenn die Adresse danach fragt, und nimmt die Frage beim Schließen heraus', async ({
  mount,
}) => {
  const component = await mount<typeof Ausstehend>(story('Ausstehend'), {
    eintragen: true,
  });

  const form = entry(component, gradeForm);
  await expect(form).toBeVisible();
  await expect(address(component)).toHaveText('/noten/k-1?eintragen=true');

  await form.getByRole('button', { name: 'Abbrechen' }).click();

  await expect(form).toHaveCount(0);
  await expect(address(component)).toHaveText('/noten/k-1');
  await expect(button(component, 'Note eintragen')).toBeFocused();
});

it('behält einen offenen Eintrag, wenn das Neuladen scheitert', async ({
  mount,
}) => {
  const component = await mount<typeof Ausstehend>(story('Ausstehend'), {
    refreshFails: true,
  });

  await button(component, 'Note eintragen').click();
  await choose(component, '12 Notenpunkte');
  await button(component, 'Neu laden').click();

  await expect(component.getByRole('alert')).toContainText(
    'Die Leistung konnte nicht aktualisiert werden.',
  );
  await expect(entry(component, gradeForm)).toBeVisible();
  await expect(onBar(component, '12 Notenpunkte')).toBeChecked();
});

it('meldet einen gescheiterten Speicherversuch im Eintrag und speichert beim nächsten', async ({
  mount,
}) => {
  const component = await mount<typeof Ausstehend>(story('Ausstehend'), {
    saveFails: true,
  });

  await button(component, 'Note eintragen').click();
  const form = entry(component, gradeForm);
  await choose(component, '12 Notenpunkte');
  await form.getByRole('button', { name: 'Note eintragen' }).click();

  await expect(form.getByRole('alert')).toHaveText(
    'Die Note konnte nicht geändert werden. Die Eingaben bleiben erhalten; prüfe die Verbindung und versuche es erneut.',
  );
  await expect(onBar(component, '12 Notenpunkte')).toBeChecked();
  await expect(status(component)).toHaveText('ausstehend');

  await form.getByRole('button', { name: 'Note eintragen' }).click();

  await expect(status(component)).toHaveText('Note: 12 P.');
});

it('fragt vor dem Löschen und geht danach zu den Noten des Fachs', async ({
  mount,
}) => {
  const component = await mount(story('Ausstehend'));

  await button(component, 'Löschen').click();
  await expect(
    component.getByText('Klausur vom 08.12. löschen?'),
  ).toBeVisible();
  // Keeping is the answer that cannot be regretted, so it is the one at hand.
  await expect(button(component, 'Behalten')).toBeFocused();

  await button(component, 'Behalten').click();
  await expect(button(component, 'Löschen')).toBeFocused();
  await expect(heading(component, 'Klausur')).toBeVisible();

  await button(component, 'Löschen').click();
  await button(component, 'Löschen').click();

  await expect(heading(component, 'Notenseite')).toBeVisible();
  await expect(address(component)).toHaveText(
    '/noten?halbjahr=hj-1&fach=mathe',
  );
});

it('meldet ein gescheitertes Löschen und lässt die Leistung stehen', async ({
  mount,
}) => {
  const component = await mount<typeof Ausstehend>(story('Ausstehend'), {
    deleteFails: true,
  });

  await button(component, 'Löschen').click();
  await button(component, 'Löschen').click();

  await expect(component.getByRole('alert')).toHaveText(
    'Die Leistung konnte nicht gelöscht werden. Sie bleibt erhalten; prüfe die Verbindung und versuche es erneut.',
  );
  await expect(
    component.getByText('Klausur vom 08.12. löschen?'),
  ).toBeVisible();
  await expect(address(component)).toHaveText('/noten/k-1');
});

it('sagt, wenn es die Leistung nicht gibt, und führt zurück zu den Noten', async ({
  mount,
}) => {
  const component = await mount<typeof Ausstehend>(story('Ausstehend'), {
    missing: true,
  });

  await expect(
    component.getByRole('heading', {
      name: 'Diese Leistung gibt es nicht mehr',
    }),
  ).toBeVisible();
  await expect(component.getByRole('alert')).toHaveCount(0);

  await component.getByRole('link', { name: 'Zu den Noten' }).click();

  await expect(heading(component, 'Notenseite')).toBeVisible();
});

it('lädt nach einem gescheiterten Laden erneut und gibt den Fokus der Überschrift', async ({
  mount,
}) => {
  const component = await mount<typeof Ausstehend>(story('Ausstehend'), {
    loadFails: true,
  });

  await expect(component.getByRole('alert')).toContainText(
    'Die Leistung konnte nicht geladen werden.',
  );
  await button(component, 'Erneut versuchen').click();

  await expect(heading(component, 'Klausur')).toBeFocused();
  await expect(component.getByRole('alert')).toHaveCount(0);
});

it('führt von der Zeile und von der Scheibe einer anderen Leistung auf deren Seite', async ({
  mount,
}) => {
  const component = await mount(story('Benotet'));

  await component
    .getByRole('region', { name: 'Auch in Mathematik' })
    .getByRole('link', { name: 'Test · Vektoren' })
    .click();
  await expect(heading(component, 'Test · Vektoren')).toBeVisible();
  await expect(address(component)).toHaveText('/noten/t-1');
  await expect(status(component)).toHaveText('Note: 10 P.');

  await component
    .getByRole('link', { name: 'Klausur vom 28.09.2026, 12 P.' })
    .click();
  await expect(address(component)).toHaveText('/noten/k-2');
  await expect(status(component)).toHaveText('Note: 12 P.');
});

it('verschiebt die Leistung in ein anderes Fach und zeigt sie dort', async ({
  mount,
}) => {
  const component = await mount(story('Benotet'));

  await button(component, 'Bearbeiten').click();
  await entry(component, 'Klausur ändern')
    .getByRole('button', { name: 'Anderes Fach' })
    .click();
  await expect(
    component.getByRole('heading', {
      name: 'Klausur verschieben: in welches Fach?',
    }),
  ).toBeVisible();
  await component.getByRole('button', { name: 'Englisch' }).click();

  // The bench is now the one of Englisch, with what was entered so far.
  await expect(
    component.getByRole('group', { name: 'Notenpunkte auf der Skala wählen' }),
  ).toBeVisible();
  await expect(onBar(component, '8 Notenpunkte')).toBeChecked();
  await entry(component, 'Klausur ändern')
    .getByRole('button', { name: 'Änderung speichern' })
    .click();

  await expect(
    component.getByText(
      'Englisch · J1.1 · Montag, 16. November 2026 · vor 10 Tagen',
    ),
  ).toBeVisible();
  await expect(
    component.getByRole('link', { name: 'Zurück zu den Noten in Englisch' }),
  ).toBeVisible();
  await expect(
    component.getByRole('heading', { name: 'Auch in Englisch' }),
  ).toBeVisible();
});
