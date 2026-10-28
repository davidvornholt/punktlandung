import { expect, test as it } from '@playwright/test';
import type {
  GleichartigeThemen,
  MitThemen,
  OhneVorbereitung,
} from './leistung-detail.story.tsx';
import {
  gleichartigeThemen,
  themen,
} from './leistung-detail.story-fixtures.ts';

const themenHeading = /## Themen/u;
const placeholderTopic = /- \[ \] Erstes Thema/u;

it('zeigt die Fakten und die Themenliste mit ihrem Stand', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/leistung-detail/MitThemen');

  await expect(
    component.getByRole('heading', { level: 1, name: 'Klausur Mathematik' }),
  ).toBeVisible();
  await expect(
    component.getByText('ausstehend', { exact: true }),
  ).toBeVisible();
  await expect(component.getByText('Klausur · 19.09.2026')).toBeVisible();
  await expect(component.getByText('1 von 2 Themen sicher')).toBeVisible();
  await expect(
    component.getByRole('checkbox', { name: 'Thema offen: Integralrechnung' }),
  ).toHaveCount(1);
  await expect(
    component.getByRole('checkbox', { name: 'Thema sicher: Ableitungsregeln' }),
  ).toBeChecked();
  await expect(
    component.getByRole('heading', { level: 3, name: 'Notizen' }),
  ).toBeVisible();
});

it('benennt gleichartige Themenkästchen nach ihrem Thema', async ({
  mount,
}) => {
  const component = await mount(
    'features/noten/ui/leistung-detail/GleichartigeThemen',
  );

  await expect(
    component.getByRole('checkbox', { name: 'Thema offen: Integralrechnung' }),
  ).toHaveCount(1);
  await expect(
    component.getByRole('checkbox', { name: 'Thema offen: Ableitungsregeln' }),
  ).toHaveCount(1);
});

it('hakt ein Thema ab, indem es die Quelltextzeile umschreibt', async ({
  mount,
  page,
}) => {
  const component = await mount('features/noten/ui/leistung-detail/MitThemen');

  await component
    .getByRole('checkbox', { name: 'Thema offen: Integralrechnung' })
    .click();

  const saved = page.getByRole('list', {
    includeHidden: true,
    name: 'Gespeicherte Vorbereitungen',
  });
  await expect(saved.getByRole('listitem', { includeHidden: true })).toHaveText(
    [themen.replace('- [ ] Integralrechnung', '- [x] Integralrechnung')],
  );
  await expect(component.getByText('alle 2 Themen sicher')).toBeVisible();
});

const integralSicher = gleichartigeThemen.replace(
  '- [ ] Integralrechnung',
  '- [x] Integralrechnung',
);
const beideSicher = integralSicher.replace(
  '- [ ] Ableitungsregeln',
  '- [x] Ableitungsregeln',
);

/** Millisekunden, die ein langsamer Speicheraufruf bis zum Server braucht. */
const langsam = 300;
const langsamer = 600;

it('speichert schnell gesetzte Haken in ihrer Reihenfolge', async ({
  mount,
  page,
}) => {
  // Der erste Aufruf braucht länger als der zweite.
  const component = await mount<typeof GleichartigeThemen>(
    'features/noten/ui/leistung-detail/GleichartigeThemen',
    { saveDelays: [langsam] },
  );

  await component
    .getByRole('checkbox', { name: 'Thema offen: Integralrechnung' })
    .click();
  await component
    .getByRole('checkbox', { name: 'Thema offen: Ableitungsregeln' })
    .click();

  const saved = page.getByRole('list', {
    includeHidden: true,
    name: 'Gespeicherte Vorbereitungen',
  });
  await expect(saved.getByRole('listitem', { includeHidden: true })).toHaveText(
    [integralSicher, beideSicher],
  );
  await expect(component.getByText('alle 2 Themen sicher')).toBeVisible();
});

it('behält einen Haken, solange er noch gespeichert wird', async ({
  mount,
  page,
}) => {
  const component = await mount<typeof GleichartigeThemen>(
    'features/noten/ui/leistung-detail/GleichartigeThemen',
    { saveDelays: [langsam, langsamer] },
  );

  await component
    .getByRole('checkbox', { name: 'Thema offen: Integralrechnung' })
    .click();
  await component
    .getByRole('checkbox', { name: 'Thema offen: Ableitungsregeln' })
    .click();
  const savedItems = page
    .getByRole('list', {
      includeHidden: true,
      name: 'Gespeicherte Vorbereitungen',
    })
    .getByRole('listitem', { includeHidden: true });
  // Der erste Haken ist gespeichert, der zweite noch unterwegs.
  await expect(savedItems).toHaveCount(1);
  await component.getByRole('button', { name: 'Lerntag-Baustein' }).click();
  await component
    .getByRole('checkbox', { name: 'Thema sicher: Integralrechnung' })
    .click();

  await expect(savedItems).toHaveText([
    integralSicher,
    beideSicher,
    gleichartigeThemen.replace(
      '- [ ] Ableitungsregeln',
      '- [x] Ableitungsregeln',
    ),
  ]);
  await expect(
    component.getByRole('checkbox', { name: 'Thema sicher: Ableitungsregeln' }),
  ).toBeChecked();
  await expect(component.getByText('1 von 2 Themen sicher')).toBeVisible();
});

it('nimmt ungespeicherte Haken zurück, wenn alle Aufrufe scheitern', async ({
  mount,
  page,
}) => {
  const component = await mount<typeof GleichartigeThemen>(
    'features/noten/ui/leistung-detail/GleichartigeThemen',
    { failedSaves: [0, 1], saveDelays: [langsam] },
  );

  await component
    .getByRole('checkbox', { name: 'Thema offen: Integralrechnung' })
    .click();
  await component
    .getByRole('checkbox', { name: 'Thema offen: Ableitungsregeln' })
    .click();

  await expect(component.getByRole('alert')).toBeVisible();
  await expect(
    page
      .getByRole('list', {
        includeHidden: true,
        name: 'Gespeicherte Vorbereitungen',
      })
      .getByRole('listitem', { includeHidden: true }),
  ).toHaveCount(0);
  await expect(
    component.getByRole('checkbox', { name: 'Thema offen: Integralrechnung' }),
  ).not.toBeChecked();
  await expect(
    component.getByRole('checkbox', { name: 'Thema offen: Ableitungsregeln' }),
  ).not.toBeChecked();
});

it('beginnt eine neue Vorbereitung mit der Vorlage der Leistungsart', async ({
  mount,
}) => {
  const component = await mount(
    'features/noten/ui/leistung-detail/OhneVorbereitung',
  );

  await expect(component.getByText('Noch keine Vorbereitung.')).toBeVisible();
  await component.getByRole('button', { name: 'Vorbereitung anlegen' }).click();

  const editor = component.getByRole('textbox', {
    name: 'Vorbereitung als Markdown',
  });
  await expect(editor).toHaveValue(themenHeading);
  await expect(editor).toHaveValue(placeholderTopic);
});

it('meldet eine Vorlage, die nicht lädt, und lädt sie erneut', async ({
  mount,
}) => {
  const component = await mount<typeof OhneVorbereitung>(
    'features/noten/ui/leistung-detail/OhneVorbereitung',
    { templateFailures: 1 },
  );

  await component.getByRole('button', { name: 'Vorbereitung anlegen' }).click();
  await expect(component.getByRole('alert')).toContainText(
    'Die Vorlage konnte nicht geladen werden.',
  );
  await component.getByRole('button', { name: 'Erneut versuchen' }).click();

  const editor = component.getByRole('textbox', {
    name: 'Vorbereitung als Markdown',
  });
  await expect(editor).toHaveValue(themenHeading);
  await expect(editor).toHaveValue(placeholderTopic);
});

it('kehrt zurück, wenn die Vorlage nicht lädt', async ({ mount }) => {
  const component = await mount<typeof OhneVorbereitung>(
    'features/noten/ui/leistung-detail/OhneVorbereitung',
    { templateFailures: 1 },
  );

  await component.getByRole('button', { name: 'Vorbereitung anlegen' }).click();
  await expect(component.getByRole('alert')).toBeVisible();
  await component.getByRole('button', { name: 'Abbrechen' }).click();

  await expect(component.getByText('Noch keine Vorbereitung.')).toBeVisible();
  await expect(component.getByRole('alert')).toHaveCount(0);
});

it('öffnet das Notenformular, um die ausstehende Klausur zu benoten', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/leistung-detail/MitThemen');

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

it('zeigt eine benotete Leistung mit ihrer Note und behält die Vorbereitung', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/leistung-detail/Benotet');

  await expect(component.getByText('11 P.', { exact: true })).toBeVisible();
  await expect(component.getByText('1 von 2 Themen sicher')).toBeVisible();
});

it('behält einen ungespeicherten Entwurf, wenn das Neuladen scheitert', async ({
  mount,
}) => {
  const component = await mount<typeof MitThemen>(
    'features/noten/ui/leistung-detail/MitThemen',
    { refreshFails: true },
  );

  await component.getByRole('button', { name: 'Text bearbeiten' }).click();
  const editor = component.getByRole('textbox', {
    name: 'Vorbereitung als Markdown',
  });
  await editor.fill('Noch nicht gespeichert');
  await component.getByRole('button', { name: 'Lerntag-Baustein' }).click();

  await expect(component.getByRole('alert')).toBeVisible();
  await expect(editor).toHaveValue('Noch nicht gespeichert');
});
