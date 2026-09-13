import type { MountResult } from '@playwright/experimental-ct-react';

type ComponentLocator = ReturnType<MountResult['getByRole']>;

/** Beide Noten liegen im selben Fach; ihr Datum unterscheidet die Zeilen. */
const rowOn = (component: ComponentLocator, datum: string) =>
  component.getByRole('listitem').filter({ hasText: datum });

export const firstRowDatum = '14.09.2026';

export const firstRow = (component: ComponentLocator) =>
  rowOn(component, firstRowDatum);

export const secondRow = (component: ComponentLocator) =>
  rowOn(component, '02.11.2026');

/** Der Notenwert steht als erstes in der Zeile. */
export const noteValue = (row: ComponentLocator) => row.locator('span').first();

export const editForm = (component: ComponentLocator) =>
  component.getByRole('form', { name: 'Note bearbeiten' });

export const noteField = (component: ComponentLocator) =>
  editForm(component).getByRole('spinbutton', { name: 'Note' });

export const openEditor = (row: ComponentLocator) =>
  row.getByRole('button', { name: 'Bearbeiten' }).click();

export const save = (component: ComponentLocator) =>
  editForm(component).getByRole('button', { name: 'Note speichern' }).click();

export const cancel = (component: ComponentLocator) =>
  editForm(component).getByRole('button', { name: 'Abbrechen' }).click();

/** Bestimmt den Ausgang des laufenden Serveraufrufs der Attrappe. */
export const settle = (
  component: ComponentLocator,
  outcome: 'complete' | 'fail',
) => component.getByTestId(outcome).dispatchEvent('click');
