import type * as playwright from '@playwright/test';

type Locator = playwright.Locator;

/** Die Zeile einer Note der Geschichte. Ihr Text taugt nicht als Kennzeichen: die Löschfrage ersetzt ihn. */
const rowOf = (component: Locator, id: string) =>
  component.locator(`li[data-row="${id}"]`);

/** Eine Zeile, deren Kennung die Geschichte nicht vorgibt, etwa die einer neu eingetragenen Note. */
export const rowOn = (component: Locator, datum: string) =>
  component.getByRole('listitem').filter({ hasText: datum });

export const firstRowDatum = 'Mo 14.09.';

/** Latein, Klausur vom 14.09., Note 2. */
export const firstRow = (component: Locator) => rowOf(component, 'note-a');

/** Latein, Klausur vom 02.11., Note 3. */
export const secondRow = (component: Locator) => rowOf(component, 'note-b');

/** Mathematik, Klausur vom 05.10., Note 2,5: ihr Eintrag lässt sich öffnen, während der einer Lateinnote noch läuft. */
export const otherFachRow = (component: Locator) => rowOf(component, 'note-c');

export const list = (component: Locator) =>
  component.getByRole('region', { name: 'Notenliste' });

/** Der Abschnitt eines Fachs mit Skala und Liste. */
export const fach = (component: Locator, name: string) =>
  component.getByRole('region', { name });

export const fachHeading = (component: Locator, name: string) =>
  component.getByRole('heading', { name });

/** Die Note am Ende der Zeile, ohne Einheit. */
export const noteValue = (row: Locator) => row.locator('[data-row-value]');

/** Der Bogen neben der Skala; es ist immer höchstens einer offen. */
export const entryForm = (component: Locator) =>
  component.locator('form[data-note-entry]');

/** Der Name eines Zeilenknopfs nennt nach dem Doppelpunkt die Note, der er gilt. */
const editName = /^Bearbeiten:/u;
const trashName = /^Löschen:/u;

export const editButton = (row: Locator) =>
  row.getByRole('button', { name: editName });

export const trashButton = (row: Locator) =>
  row.getByRole('button', { name: trashName });

export const openEditor = (row: Locator) => editButton(row).click();

/** Die Note wird auf der Skala gewählt: `name` ist etwa "Note 1" oder "Note 2,5". */
export const noteOnBar = (component: Locator, name: string) =>
  component.getByRole('radio', { name, exact: true });

/** Die Auswahlknöpfe der Skala sind nur für Tastatur und Vorleseprogramm da; gewählt wird deshalb mit der Leertaste. */
export const chooseNote = async (component: Locator, name: string) => {
  const radio = noteOnBar(component, name);
  await radio.focus();
  await radio.press('Space');
};

export const saveButton = (component: Locator) =>
  entryForm(component).getByRole('button', { name: 'Änderung speichern' });

export const save = (component: Locator) => saveButton(component).click();

export const cancelButton = (component: Locator) =>
  entryForm(component).getByRole('button', { name: 'Abbrechen' });

export const cancel = (component: Locator) => cancelButton(component).click();

/** Fragt nach und löscht dann. */
export const deleteRow = async (row: Locator) => {
  await trashButton(row).click();
  await row.getByRole('button', { name: 'Löschen', exact: true }).click();
};

/** Die Wahl des Fachs für eine neue oder eine umziehende Note. */
export const chooser = (component: Locator) =>
  component.locator('[data-chooser]');

export const pickFach = (component: Locator, name: string) =>
  chooser(component).getByRole('button', { name }).click();

/** Was in der Adresse der Seite stünde, als JSON. */
export const search = (component: Locator) => component.getByTestId('search');

/** Bestimmt den Ausgang des laufenden Serveraufrufs der Attrappe. */
export const settle = (component: Locator, outcome: 'complete' | 'fail') =>
  component.getByTestId(outcome).dispatchEvent('click');
