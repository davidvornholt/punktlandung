import type { Locator } from '@playwright/test';

/** Beide Noten liegen im selben Fach; ihr Datum unterscheidet die Zeilen. */
const rowOn = (component: Locator, datum: string) =>
  component.getByRole('listitem').filter({ hasText: datum });

export const firstRowDatum = '14.09.2026';

export const firstRow = (component: Locator) => rowOn(component, firstRowDatum);

export const secondRow = (component: Locator) => rowOn(component, '02.11.2026');

/** Der Notenwert steht als erstes in der Zeile. */
export const noteValue = (row: Locator) => row.locator('span').first();

export const editForm = (component: Locator) =>
  component.getByRole('form', { name: 'Note bearbeiten' });

export const noteField = (component: Locator) =>
  editForm(component).getByRole('spinbutton', { name: 'Note' });

export const openEditor = (row: Locator) =>
  row.getByRole('button', { name: 'Bearbeiten' }).click();

export const save = (component: Locator) =>
  editForm(component).getByRole('button', { name: 'Note speichern' }).click();

export const cancel = (component: Locator) =>
  editForm(component).getByRole('button', { name: 'Abbrechen' }).click();

/** Bestimmt den Ausgang des laufenden Serveraufrufs der Attrappe. */
export const settle = (component: Locator, outcome: 'complete' | 'fail') =>
  component.getByTestId(outcome).dispatchEvent('click');
