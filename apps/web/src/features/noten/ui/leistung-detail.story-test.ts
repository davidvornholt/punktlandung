import { expect, test as it } from '@playwright/test';
import type { Ausstehend } from './leistung-detail.story.tsx';

it('zeigt die Fakten einer ausstehenden Leistung', async ({ mount }) => {
  const component = await mount('features/noten/ui/leistung-detail/Ausstehend');

  await expect(
    component.getByRole('heading', { level: 1, name: 'Klausur Mathematik' }),
  ).toBeVisible();
  await expect(
    component.getByText('ausstehend', { exact: true }),
  ).toBeVisible();
  await expect(component.getByText('Klausur · 19.09.2026')).toBeVisible();
  await expect(component.getByText('J1.1 · 2026/27')).toBeVisible();
});

it('öffnet das Notenformular, um die ausstehende Klausur zu benoten', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/leistung-detail/Ausstehend');

  await component.getByRole('button', { name: 'Note eintragen' }).click();
  const form = component.getByRole('form', { name: 'Note bearbeiten' });
  await expect(form).toBeVisible();
  await expect(form.getByLabel('Punkte')).toHaveValue('');

  await form.getByLabel('Punkte').fill('12');
  await form.getByRole('button', { name: 'Note speichern' }).click();

  await expect(component.getByText('12 P.', { exact: true })).toBeVisible();
  await expect(
    component.getByRole('button', { name: 'Bearbeiten', exact: true }),
  ).toBeVisible();
});

it('zeigt eine benotete Leistung mit ihrer Note', async ({ mount }) => {
  const component = await mount('features/noten/ui/leistung-detail/Benotet');

  await expect(component.getByText('11 P.', { exact: true })).toBeVisible();
  await expect(
    component.getByRole('button', { name: 'Bearbeiten', exact: true }),
  ).toBeVisible();
});

it('behält ein offenes Notenformular, wenn das Neuladen scheitert', async ({
  mount,
}) => {
  const component = await mount<typeof Ausstehend>(
    'features/noten/ui/leistung-detail/Ausstehend',
    { refreshFails: true },
  );

  await component.getByRole('button', { name: 'Note eintragen' }).click();
  const punkte = component
    .getByRole('form', { name: 'Note bearbeiten' })
    .getByLabel('Punkte');
  await punkte.fill('12');
  await component.getByRole('button', { name: 'Neu laden' }).click();

  await expect(component.getByRole('alert')).toBeVisible();
  await expect(punkte).toHaveValue('12');
});
