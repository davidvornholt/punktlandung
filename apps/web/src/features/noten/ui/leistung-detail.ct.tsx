import { expect, test as it } from '@playwright/experimental-ct-react';

import { themen } from './leistung-detail.ct-fixtures.ts';
import { LeistungDetailStory } from './leistung-detail.ct-story.tsx';

const themenHeading = /## Themen/u;
const placeholderTopic = /- \[ \] Erstes Thema/u;

it('zeigt die Fakten und die Themenliste mit ihrem Stand', async ({
  mount,
}) => {
  const component = await mount(<LeistungDetailStory scenario="mit-themen" />);

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
    <LeistungDetailStory scenario="gleichartige-themen" />,
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
  const component = await mount(<LeistungDetailStory scenario="mit-themen" />);

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

it('beginnt eine neue Vorbereitung mit der Vorlage der Leistungsart', async ({
  mount,
}) => {
  const component = await mount(
    <LeistungDetailStory scenario="ohne-vorbereitung" />,
  );

  await expect(component.getByText('Noch keine Vorbereitung.')).toBeVisible();
  await component.getByRole('button', { name: 'Vorbereitung anlegen' }).click();

  const editor = component.getByRole('textbox', {
    name: 'Vorbereitung als Markdown',
  });
  await expect(editor).toHaveValue(themenHeading);
  await expect(editor).toHaveValue(placeholderTopic);
});

it('öffnet das Notenformular, um die ausstehende Klausur zu benoten', async ({
  mount,
}) => {
  const component = await mount(<LeistungDetailStory scenario="mit-themen" />);

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
  const component = await mount(<LeistungDetailStory scenario="benotet" />);

  await expect(component.getByText('11 P.', { exact: true })).toBeVisible();
  await expect(component.getByText('1 von 2 Themen sicher')).toBeVisible();
});
